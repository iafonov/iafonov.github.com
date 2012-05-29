---
title: Dealing with slow test suites - statistics to the rescue
layout: post
---

# Dealing with slow test suites - statistics to the rescue

<div class="date">[25 May 2012]</div>

In most cases if you're using cucumber as it should be used i.e. you're covering the most critical paths of userflow it means that even if one scenario is failing - your application is broken and it shouldn't go live.

In the application I'm working on now we have ~150 scenarios and we are using selenium as a test driver. It means that we have quite realistic tests, slow running time and rare but very annoying random failures. The running time of test suite is close to 30 minutes and usually developers run only a small relevant subset of cucumber tests before committing to repository leaving the job of running the whole test suite to a Jenkins CI.

Recently I've started thinking about possible ways of reducing suite running time and one of the ideas that crossed my mind was using statistical analysis to re-arrange test suite and try to predict tests that are going to fail and allow them to [fail faster](http://en.wikipedia.org/wiki/Fail-fast). For now we have collected data from ~500 failed builds and after processing it I've got list of top 5% of most frequent failing tests. Which we are running in a separate run before running the whole test suite. Running 7-8 scenarios consumes significantly lower than the time which is needed to run the whole test suite.

If you're good at statistics and math you can built interesting _conspiracy_ theories and even try to use machine learning techniques to analyze the data. I have used the most obvious method to rank tests - the most recent failure will give test higher score so 10 subsequent test failures five month ago would be less important than 2 failures in recent runs. Assuming that builds are enumerated I give each test (build\_number/builds_count) points for each failure and after summing and sorting tests by this ranking I get list of tests that are most likely going to fail.

Even if you're not going to rearrange tests having such statistics is very interesting thing itself. Test that fails frequently usually could mean two big things:

* You've got a bad test. With selenium usually long test == bad test. You have list of tests that you can rework.
* You've got a weak place in application that is very easy to break. 

To setup Jenkins CI all you need is write a simple script that accumulates statistics and runs top failing tests first and then runs remaining test suite. Here is example of script I'm using:

    require 'fileutils'

    BUILDS_PATH = '/var/lib/jenkins/jobs/secret_project/builds'

    builds = Dir.entries(BUILDS_PATH).select{|dir| dir =~ /^\d{1,4}$/}.map{|dir| dir.to_i}.sort

    stats = builds.inject({}) do |stats, build_number|
      `grep -r "cucumber" #{File.join(BUILDS_PATH, build_number.to_s)}`.each do |line|
        line.match /workspace\/(.*?)\:(\d*).*Scenario: (.*)/

        next if $1.nil?

        if stats.has_key? $1
          stats[$1][:count] += 1
          stats[$1][:weight] += (build_number.to_f / builds.size)
        else
          stats[$1] = { :count => 0, :feature => $1, :line => $2, :scenario => $3, :weight => 0 }
        end
      end

      stats
    end

    top_failing = stats.sort_by{ |k, v| v[:weight] }.
                        select{|line| FileTest.exists?(line[1][:feature]) }.
                        reverse.first(5).map{|line| line[1]}

    p "Top failing features"
    top_failing.each { |line| p "#{line[:feature]}: fails = #{line[:count]}; weight = #{line[:weight]};"}

    run_top_failing = "bundle exec cucumber --tags ~@wip -r features/ #{top_failing.map{|line| line[:feature]}.join(" ")}"
    rm_top_failing  = "rm #{top_failing.map{|line| line[:feature]}.join(" ")}"
    run_remaining   = "bundle exec cucumber --tags ~@wip -r features/ features/"

    exec [run_top_failing, rm_top_failing, run_remaining].join(" && ")
