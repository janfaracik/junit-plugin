/*
 * The MIT License
 *
 * Copyright (c) 2026 Jan Faracik
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
package hudson.tasks.test;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import hudson.tasks.junit.CaseResult;
import hudson.tasks.junit.ClassResult;
import hudson.tasks.junit.PackageResult;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * View-model node used to render expandable test trees in Jelly.
 */
public final class TestTreeNode {
    private static final Comparator<TestTreeNode> BY_KIND_AND_LABEL =
            Comparator.comparingInt((TestTreeNode node) -> node.kind.order)
                    .thenComparing(TestTreeNode::getLabel, String.CASE_INSENSITIVE_ORDER);

    private final Kind kind;
    private String label;
    private final List<TestTreeNode> children = new ArrayList<>();
    private final Map<String, TestTreeNode> packageChildren = new LinkedHashMap<>();

    private @CheckForNull TestObject testObject;
    private @CheckForNull String url;
    private @CheckForNull String metaText;
    private @CheckForNull String iconFileName;
    private @CheckForNull String treePath;
    private boolean skippedWithoutMessage;

    private TestTreeNode(Kind kind, String label) {
        this.kind = kind;
        this.label = label;
    }

    public static TestTreeNode packageNode(String label) {
        return new TestTreeNode(Kind.PACKAGE, label);
    }

    public static TestTreeNode fromTestResult(TestResult result, TestObject relativeParent) {
        TestTreeNode node = new TestTreeNode(kindFor(result), labelFor(result));
        node.attach(result, relativeParent);
        if (result instanceof TabulatedResult tabulated && tabulated.hasChildren()) {
            for (TestResult child : tabulated.getChildren()) {
                node.addChild(fromTestResult(child, relativeParent));
            }
        }
        return node;
    }

    private static Kind kindFor(TestResult result) {
        if (result instanceof CaseResult) {
            return Kind.CASE;
        }
        if (result instanceof ClassResult) {
            return Kind.CLASS;
        }
        if (result instanceof PackageResult) {
            return Kind.PACKAGE;
        }
        return Kind.OTHER;
    }

    private static String labelFor(TestResult result) {
        if (result instanceof PackageResult && result.getDisplayName().isEmpty()) {
            return "(default package)";
        }
        return result.getDisplayName();
    }

    public void attach(TestResult result, TestObject relativeParent) {
        this.testObject = result;
        this.url = result.getRelativePathFrom(relativeParent);
        if (result instanceof CaseResult caseResult) {
            this.metaText = caseResult.getDurationString();
            this.iconFileName = caseResult.getIconFileName();
            this.skippedWithoutMessage = caseResult.isSkipped()
                    && (caseResult.getSkippedMessage() == null || caseResult.getSkippedMessage().isEmpty());
        } else {
            this.iconFileName = aggregateIconFileName(result);
            this.metaText = result.getFailCount() + " fail / " + result.getSkipCount() + " skip / "
                    + result.getPassCount() + " pass / " + result.getTotalCount() + " total / "
                    + result.getDurationString();
        }
    }

    private static String aggregateIconFileName(TestResult result) {
        if (result.getFailCount() > 0) {
            return "symbol-status-red";
        }
        if (result.getTotalCount() > 0 && result.getSkipCount() == result.getTotalCount()) {
            return "symbol-status-skipped plugin-junit";
        }
        return "symbol-status-blue";
    }

    public TestTreeNode getOrCreatePackageChild(String label) {
        TestTreeNode existing = packageChildren.get(label);
        if (existing != null) {
            return existing;
        }
        TestTreeNode created = packageNode(label);
        packageChildren.put(label, created);
        children.add(created);
        return created;
    }

    public void addChild(TestTreeNode child) {
        children.add(child);
    }

    public void sortRecursively() {
        children.sort(BY_KIND_AND_LABEL);
        children.forEach(TestTreeNode::sortRecursively);
    }

    public void collapseTreeBranches() {
        children.forEach(TestTreeNode::collapseTreeBranches);

        while (canCollapsePackageChild() || canCollapseSingleClassChild()) {
            collapseIntoOnlyChild();
        }
    }

    private boolean canCollapsePackageChild() {
        return kind == Kind.PACKAGE && testObject == null && children.size() == 1 && children.get(0).kind == Kind.PACKAGE;
    }

    private boolean canCollapseSingleClassChild() {
        return kind == Kind.PACKAGE && children.size() == 1 && children.get(0).kind == Kind.CLASS;
    }

    private void collapseIntoOnlyChild() {
        TestTreeNode child = children.get(0);
        label = label + "." + child.label;
        testObject = child.testObject;
        url = child.url;
        metaText = child.metaText;
        iconFileName = child.iconFileName;
        skippedWithoutMessage = child.skippedWithoutMessage;

        children.clear();
        children.addAll(child.children);

        packageChildren.clear();
        for (TestTreeNode grandChild : children) {
            if (grandChild.kind == Kind.PACKAGE) {
                packageChildren.put(grandChild.label, grandChild);
            }
        }
    }

    public static void prepareForRendering(List<TestTreeNode> nodes) {
        nodes.sort(BY_KIND_AND_LABEL);
        for (int i = 0; i < nodes.size(); i++) {
            nodes.get(i).assignTreePaths(Integer.toString(i));
        }
    }

    private void assignTreePaths(String path) {
        treePath = path;
        children.sort(BY_KIND_AND_LABEL);
        for (int i = 0; i < children.size(); i++) {
            children.get(i).assignTreePaths(path + "." + i);
        }
    }

    public static @CheckForNull TestTreeNode findByTreePath(List<TestTreeNode> nodes, @CheckForNull String path) {
        if (path == null || path.isBlank()) {
            return null;
        }

        List<TestTreeNode> currentChildren = nodes;
        TestTreeNode currentNode = null;
        for (String segment : path.split("\\.")) {
            int index;
            try {
                index = Integer.parseInt(segment);
            } catch (NumberFormatException e) {
                return null;
            }

            if (index < 0 || index >= currentChildren.size()) {
                return null;
            }

            currentNode = currentChildren.get(index);
            currentChildren = currentNode.children;
        }

        return currentNode;
    }

    public boolean isExpandable() {
        return !children.isEmpty();
    }

    public boolean isLeaf() {
        return children.isEmpty();
    }

    public boolean isCaseNode() {
        return kind == Kind.CASE;
    }

    public boolean isSkippedWithoutMessage() {
        return skippedWithoutMessage;
    }

    public String getLabel() {
        return label;
    }

    public List<TestTreeNode> getChildren() {
        return children;
    }

    public @CheckForNull String getUrl() {
        return url;
    }

    public @CheckForNull String getMetaText() {
        return metaText;
    }

    public @CheckForNull String getIconFileName() {
        return iconFileName;
    }

    public @CheckForNull TestObject getTestObject() {
        return testObject;
    }

    public @CheckForNull String getTreePath() {
        return treePath;
    }

    private enum Kind {
        PACKAGE(0),
        CLASS(1),
        OTHER(2),
        CASE(3);

        private final int order;

        Kind(int order) {
            this.order = order;
        }
    }
}
