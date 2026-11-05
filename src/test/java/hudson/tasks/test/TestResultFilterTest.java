package hudson.tasks.test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import hudson.model.FreeStyleBuild;
import hudson.model.FreeStyleProject;
import hudson.model.Result;
import hudson.tasks.junit.JUnitResultArchiver;
import java.util.List;
import org.htmlunit.Page;
import org.htmlunit.html.DomElement;
import org.htmlunit.html.HtmlPage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.TouchBuilder;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class TestResultFilterTest {

    private JenkinsRule rule;
    private FreeStyleBuild build;

    @BeforeEach
    void setUp(JenkinsRule rule) throws Exception {
        this.rule = rule;
        FreeStyleProject p = rule.createFreeStyleProject();
        p.getBuildersList().add(new TouchBuilder());
        p.getPublishersList().add(new JUnitResultArchiver("x.xml"));
        rule.jenkins
                .getWorkspaceFor(p)
                .child("x.xml")
                .write(
                        "<testsuite name='S'>"
                                + "<testcase classname='pkg.Alpha' name='broken'><failure/></testcase>"
                                + "<testcase classname='pkg.Alpha' name='works'/>"
                                + "<testcase classname='pkg.Beta' name='ignored'><skipped message='later'/></testcase>"
                                + "<testcase classname='pkg.Beta' name='alsoWorks'/>"
                                + "</testsuite>",
                        null);
        build = rule.assertBuildStatus(Result.UNSTABLE, p.scheduleBuild2(0));
    }

    @Test
    void showsFailuresAndOnlyLinksToTheOtherLists() throws Exception {
        try (JenkinsRule.WebClient wc = rule.createWebClient()) {
            HtmlPage page = wc.getPage(build, "testReport/");

            // the menu's items are in a template, which selectors don't look inside
            String html = page.getWebResponse().getContentAsString();
            for (String status : List.of("failed", "skipped", "passed")) {
                assertTrue(html.contains("data-dropdown-id=\"jp-filter-" + status + "\""), status);
            }

            DomElement failed = page.querySelector(".jp-test-list[data-status='failed']");
            assertTrue(failed.getTextContent().contains("broken"));
            assertFalse(failed.hasAttribute("hidden"));

            // the others are only loaded when they're turned on
            for (String status : List.of("skipped", "passed")) {
                DomElement list = page.querySelector(".jp-test-list[data-status='" + status + "']");
                assertTrue(list.hasAttribute("hidden"), status);
                assertEquals(
                        rule.contextPath + "/" + build.getUrl() + "testReport/testList?status=" + status,
                        list.getAttribute("data-lazy-url"));
            }
            assertNull(page.querySelector(".task[data-search='pkg.Alpha.works']"));
        }
    }

    @Test
    void listsTheTestsWithTheGivenStatusGroupedByClass() throws Exception {
        try (JenkinsRule.WebClient wc = rule.createWebClient()) {
            HtmlPage passed = wc.goTo(build.getUrl() + "testReport/testList?status=passed");
            assertNotNull(passed.querySelector(".task[data-search='pkg.Alpha.works']"));
            assertNotNull(passed.querySelector(".task[data-search='pkg.Beta.alsoWorks']"));
            assertNull(passed.querySelector(".task[data-search='pkg.Alpha.broken']"));
            assertEquals(2, passed.querySelectorAll(".jp-test-group").size());

            HtmlPage skipped = wc.goTo(build.getUrl() + "testReport/testList?status=skipped");
            assertNotNull(skipped.querySelector(".task[data-search='pkg.Beta.ignored']"));
            assertEquals(1, skipped.querySelectorAll(".task").size());
        }
    }

    @Test
    void rejectsUnknownStatuses() throws Exception {
        try (JenkinsRule.WebClient wc = rule.createWebClient()) {
            wc.setThrowExceptionOnFailingStatusCode(false);
            Page page = wc.goTo(build.getUrl() + "testReport/testList?status=nope", null);
            assertEquals(400, page.getWebResponse().getStatusCode());
        }
    }
}
