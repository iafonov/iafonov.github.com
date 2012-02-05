---
title: Setting up Jenkins CI to run selenium tests and record video in three easy steps
layout: post
---

# Setting up Jenkins CI to run selenium tests and record video in three easy steps #

<div class="data">[2 Sep 2011]</div>

1. Add [`headless`] [1] gem to test environment dependencies in your Gemfile:

        group :cucumber, :test do
          gem 'headless', '~> 0.2.1'
        end

    Headless is a wrapper for [`Xvfb`][2] - X Window virtual frame buffer. Also it supports video capturing from virtual screen using `ffmpeg` utility.

2. Put this into `features/support` folder. I prefer to call this file headless.rb but you can name it yourself:

        if ENV['BUILD_NUMBER'].present?
          require 'headless'

          headless = Headless.new(:display => SERVER_PORT)
          headless.start

          at_exit do
            headless.destroy
          end

          Before do
            headless.video.start_capture
          end

          After do |scenario|
            if scenario.failed?
              headless.video.stop_and_save(video_path(scenario))
            else
              headless.video.stop_and_discard
            end
          end

          def video_path(scenario)
            "#{scenario.name.split.join("_")}.mov"
          end
        end

    Xvfb instance will be started before execution of all tests. I set display number to a constant to support parallel execution of tests `SERVER_PORT` is shared only inside one process. If you don't need parallel execution - you can just set it to predefined number.

    Video recording would start before each scenario and would be saved only if scenario has failed.

    `ENV['BUILD_NUMBER']` is one of several environment variables that is set by Jenkins CI when it runs builds. If you'll need to run test manually in headless environment just supply it in command.

        BUILD_NUMBER=1 bundle exec cucumber features/

3.  Setup Jenkins to archive videos of failed tests:

    Add this before step to remove files of previous tests run (yes I'm lazy:):

    ![alt text](http://i.imgur.com/YsjPt.png "Jenkins before build step")


    Check Archive the artifacts checkbox in Post-build Actions, and set it to archive mov files:

    ![alt text](http://i.imgur.com/NHfTX.png "Jenkins after build step")

    Result:

    After each build on build's page you'll see list of videos of failed scenarios. Most modern browsers support direct video playback of mov format which is used by `headless` by default.

    ![alt text](http://i.imgur.com/a82XV.png "Results")
