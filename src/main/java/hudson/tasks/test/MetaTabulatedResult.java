/*
 * The MIT License
 *
 * Copyright (c) 2004-2009, Sun Microsystems, Inc., Kohsuke Kawaguchi, Yahoo!, Inc.
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

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import org.kohsuke.stapler.HttpResponse;
import org.kohsuke.stapler.HttpResponses;
import org.kohsuke.stapler.QueryParameter;

/**
 * The purpose of this class is to provide a good place for the
 * jelly to bind to.
 * {@link TabulatedResult} whose immediate children
 * are other {@link TabulatedResult}s.
 *
 * @author Kohsuke Kawaguchi
 */
public abstract class MetaTabulatedResult extends TabulatedResult {

    public List<TestTreeNode> getAllTestsTree() {
        List<TestTreeNode> nodes = new ArrayList<>();
        for (TestResult child : getChildren()) {
            nodes.add(TestTreeNode.fromTestResult(child, this));
        }
        TestTreeNode.prepareForRendering(nodes);
        return nodes;
    }

    public HttpResponse doTreeChildren(@QueryParameter String path) {
        TestTreeNode node = TestTreeNode.findByTreePath(getAllTestsTree(), path);
        if (node == null || !node.isExpandable()) {
            return HttpResponses.notFound();
        }
        return HttpResponses.forwardToView(node, "children.jelly");
    }

    /**
     * All failed tests.
     */
    @Override
    public abstract Collection<? extends TestResult> getFailedTests();
}
