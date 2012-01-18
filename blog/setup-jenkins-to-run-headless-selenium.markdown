---
title: Setting up Jenkins CI to run selenium tests and record video in three easy steps
---
<link href="../stylesheets/markdown.css" rel="stylesheet"></link>

# Setting up Jenkins CI to run selenium tests and record video in three easy steps #

[<< Back][3]

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

[<< Back][3]

<div id="disqus_thread"></div>
<script type="text/javascript">
    /* * * CONFIGURATION VARIABLES: EDIT BEFORE PASTING INTO YOUR WEBPAGE * * */
    var disqus_shortname = 'iafonov'; // required: replace example with your forum shortname

    /* * * DON'T EDIT BELOW THIS LINE * * */
    (function() {
        var dsq = document.createElement('script'); dsq.type = 'text/javascript'; dsq.async = true;
        dsq.src = 'http://' + disqus_shortname + '.disqus.com/embed.js';
        (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(dsq);
    })();
</script>
<noscript>Please enable JavaScript to view the <a href="http://disqus.com/?ref_noscript">comments powered by Disqus.</a></noscript>
<a href="http://disqus.com" class="dsq-brlink">blog comments powered by <span class="logo-disqus">Disqus</span></a>

[1]: https://github.com/leonid-shevtsov/headless        "headless"
[2]: http://en.wikipedia.org/wiki/Xvfb        "Xvfb"
[3]: http://iafonov.github.com        "Home"

<script src="http://static.getclicky.com/js" type="text/javascript"></script>
<script type="text/javascript">clicky.init(252648);</script>
<noscript><p><img alt="Clicky" width="1" height="1" src="http://in.getclicky.com/252648ns.gif" /></p></noscript>
<!-- Yandex.Metrika counter -->
<div style="display:none;"><script type="text/javascript">
(function(w, c) {
    (w[c] = w[c] || []).push(function() {
        try {
            w.yaCounter11840050 = new Ya.Metrika({id:11840050, enableAll: true, webvisor:true});
        }
        catch(e) { }
    });
})(window, "yandex_metrika_callbacks");
</script></div>
<script src="//mc.yandex.ru/metrika/watch.js" type="text/javascript" defer="defer"></script>
<noscript><div><img src="//mc.yandex.ru/watch/11840050" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
<!-- /Yandex.Metrika counter -->