---
title: Dealing with slow test suites - statistics to the rescue
layout: post
---

# Dealing with slow test suites - statistics to the rescue

<div class="date">[29 May 2012]</div>

<a href="http://en.wikipedia.org/wiki/Moneyball_(film)">
  <img style="padding-bottom: 15px; padding-top: 15px" src="http://i.imgur.com/ixIT5.jpg">
</a>

In most cases if you're using cucumber (or any other acceptance test framework) as it should be used i.e. you're covering the most critical paths of user flow it means that even if one scenario is failing - your application is broken and it shouldn't go live.

In the application I'm working on now we have ~150 scenarios and we are using selenium as a test driver. It means that we have quite realistic tests, slow running time and rare but very annoying random failures. The running time of test suite is close to 30 minutes and usually developers run only a small relevant subset of cucumber tests before committing to repository leaving the job of running the whole test suite to a Jenkins CI.

Recently I've started thinking about possible ways of reducing suite running time and one of the ideas that crossed my mind was using statistical analysis to re-arrange test suite and try to predict tests that are going to fail and allow them to [fail faster](http://en.wikipedia.org/wiki/Fail-fast). For now we have collected data from ~500 failed builds and after processing it I've got list of top 5% of most frequent failing tests, which we are running in a separate run before running the whole test suite. Running 7-8 scenarios consumes significantly lower time than running the whole test suite.

If you're good at statistics and math you can build interesting _conspiracy_ theories and even try to use machine learning techniques to analyze the data. I have used the most obvious and straightforward method to rank failing tests - the most recent failure will give test higher score so 10 subsequent test failures five month ago would be less important than 2 failures in recent runs. Assuming that builds are enumerated each test is given `build\_number/builds_count` points for failure and after summing and sorting tests by this ranking I get list of tests that are most likely are going to fail.

Even if you're not going to re-arrange tests - having such statistics is very useful thing itself. Test that fails frequently usually could mean two important things:

* You've got a bad test. With selenium usually long test == bad test. Now you have list of tests that you can rework.
* You've got a weak place in application that is very easy to break.

To setup Jenkins CI all you need is create a simple script that accumulates statistics and runs top failing tests first and then runs the remaining test suite. You can find example of such script in this [gist](https://gist.github.com/2828887).
