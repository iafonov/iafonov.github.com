---
title: Running tests in parallel - utilize all your processor cores to accelerate your development cycle
---
<link href="../stylesheets/markdown.css" rel="stylesheet"></link>

# Running tests in parallel &ndash; utilize all your processor cores to accelerate your development cycle #

[<< Back](http://iafonov.github.com/)

![alt text](wtf.png "WTF")

From my experience the main problem with long running test suites is that team starts to simply ignore them. When you have to wait one hour between commit and deploy usually you switch your context and switching it forth and back could lead to lose of productivity. I think that the minimum acceptable time for running the full and complete test suite falls between 15-20 minutes. If the test suite is running for a longer time - it could be sign of a problem.

Running tests in parallel is quite old and trivial idea but I've been always very skeptical about it. I thought that the cost of the maintenance of the testing environment for a small team without a dedicated engineer will be significantly higher than the potential outcome. But when I've started using [`parallel_spec`](https://github.com/grosser/parallel_tests) gem I was really impressed by the ease of configuration and speedup I got without doing any significant changes in project's test suite.


## Speeding up specs

Unit test suite is an ideal candidate for parallelizing. Tests are isolated, small and they have minimal memory footprint. In most cases you don't need to change anything to start running your tests in parallel. When I've started using `parallel_spec` the only thing I had to do was adding `parallel_spec` gem to the project's Gemfile. After that all I had to do was reconfiguring CI to run `rake parallel:prepare parallel:spec` instead of usual spec runner. The transition was very easy and smooth. I haven't saw any kind of artifacts or random failures that were caused by running specs in parallel.

Here are steps to setup running specs in parallel:

1. Add `parallel_spec` gem to test section of your Gemfile
2. Run rake `parallel:create parallel:prepare parallel:spec`

You can control number of cores used by tests by supplying number in square brackets after each rake task invocation command. Note if you're using `zsh` as I do, you'll have to put command in quotation marks like this `rake "parallel:spec[4]"`

Here is some benchmarks that I got on our project spec's suite:

<table>
  <tr>
    <th>Environment</th>
    <th>Time</th>
  </tr>
  <tr>
    <td>1 CPU (Mac OS X 10.7, Intel Core i5 3GHz)</td>
    <td>4m 37s</td>
  </tr>
  <tr>
    <td>2 CPUs (Mac OS X 10.7, Intel Core i5 3GHz)</td>
    <td>3m 20s</td>
  </tr>
  <tr>
    <td>4 CPUs (Mac OS X 10.7, Intel Core i5 3GHz)</td>
    <td>2m 20s</td>
  </tr>
  <tr>
    <td>4 CPUs (Ubuntu 10.10, Intel Xeon 2.27GHz with 8M cache per core, VPS)</td>
    <td>1m 51s</td>
  </tr>
</table>

As you can see the timings has decreased by 50% on my developer's machine but they are still higher than numbers even from cheapest VPS setup. The reason for this is quite simple - on VPS setups usually you're paying additional money for RAM and storage but the CPU is almost always the same and in most cases it would be very powerful enterprise level model.

## Speeding up acceptance tests

I'm a big fan of BDD and I'm using cucumber with selenium as a driver. Using real browser has disadvantages and one of the most significant is - its performance. Selenium drives firefox which has quite significant memory footprint. In the project I'm working on our acceptance test suite broke 20 minutes running time in 2 month and speeding it up was critical task.

Running features in parallel unlike specs requires some tweaking of your test suite. You should always remember that if you're running tests in parallel they should be isolated from each other. To run features in parallel you'll have to consider the following changes:

1. You have to setup capybara to spawn application server on different ports depending on `TEST_ENV_NUMBER` environment variable. This variable is set to different values depending on the process and its main purpose is to allow you to isolate environments from each other:

 
        SERVER_PORT = 10000 + ENV['TEST_ENV_NUMBER'].to_i
        Capybara.server_port = SERVER_PORT

2. You have manually check and verify that your tests do not depend on shared resources. For example in our application we are using [`email_spec`](https://github.com/bmabey/email-spec) to test emails and because of asynchronous nature of selenium tests we have to dump emails to file and then read it on a test side. But the fix is quite trivial - again we utilized `TEST_ENV_NUMBER` variable and put it to the name of the file so each process uses its own file to dump emails to.

        DELIVERIES_PATH = File.join(RAILS_ROOT, "tmp", "deliveries#{ENV['TEST_ENV_NUMBER']}.cache")

If you're using Rails 2 you'll have manually create a new delivery method for test purposes and put emails to a file. Here is [gist](https://gist.github.com/e224c4cf78102f44c498) with corresponding delivery method source code. With Rails 3 you can just use built-in `:file` delivery method which basically does the same thing.

With cucumber tests, especially if you're using selenium you shouldn't expect linear speedup, the main reason for this is firefox - it's big, slow and unpredictable. You should be very careful with choosing concurrency level and watch RAM consumption of your tests, if tests will start hitting swap - you're in trouble, your tests could start failing randomly due to unpredictable timeouts. If you have dedicated CI server (and you should have it) you can calculate approximate level of concurrency by dividing available memory amount by 500M.

Here are some results I get during performance evaluation on my developer's machine and on dedicated CI server.

<table>
  <tr>
    <th>Environment</th>
    <th>Time</th>
  </tr>
  <tr>
    <td>1 CPU (Mac OS X 10.7, Intel Core i5 3GHz)</td>
    <td>23m 22s</td>
  </tr>
  <tr>
    <td>4 CPUs (Mac OS X 10.7, Intel Core i5 3GHz)</td>
    <td>17m 15s</td>
  </tr>
  <tr>
    <td>2 CPUs (Ubuntu 10.10, Intel Xeon 2.27GHz)</td>
    <td>17m 13s</td>
  </tr>
  <tr>
    <td>4 CPUs (Ubuntu 10.10, Intel Xeon 2.27GHz)</td>
    <td>12m 13s</td>
  </tr>
  <tr>
    <td>2x4 CPUs (Ubuntu 10.10, Intel Xeon 2.27GHz)</td>
    <td>13m 42s</td>
  </tr>
</table>

As you can see going from 1 to 4 cores gives significant speed up. Using 8 cores, even if they are available, isn't really needed because the main bottleneck is memory amount and performance. Note how transition from desktop to dedicated server increases performance.

## Some conclusions

Parallelizing you test suite could be a good way to improve timings but at the same time it's only extensive way of optimization, if you want intensively optimize your test suite you have to consider other techniques that require more effort to complete but offer much better outcome. 

For unit tests you can go from doing 'true' isolated model tests that do not hit the database to tests that have enough isolation level to not even require Rails application stack.

For functional tests you can consider using things like `capybara-webkit` or `rack-test` but in my opinion with getting performance advantage you would lose the feeling of tests that are as realistic as users interaction is. Before we moved to `selenium` we used `HtmlUnit` for user interaction simulation and several times we had problems with test that passes but real user wasn't able to do the same thing. The canonical example for such thing is overlays blocking user input. Things like HtmlUnit/rack-test wouldn't be able to figure it out and will click on the element even if it is hidden from the user, selenium in this case will throw an exception and you would be able to notice problem earlier than it goes into production. Also one cool thing about selenium - you can record a video of tests even on headless machine and later you would be able to use this video for problems diagnosis (See more about this topic [here](http://iafonov.github.com/blog/setup-jenkins-to-run-headless-selenium.html)).

[<< Back](http://iafonov.github.com/)

<div id="disqus_thread"></div>
<script src="http://static.getclicky.com/js" type="text/javascript"></script>
<script type="text/javascript">clicky.init(252648);</script>
<noscript><p><img alt="Clicky" width="1" height="1" src="http://in.getclicky.com/252648ns.gif" /></p></noscript>
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

<script src="http://static.getclicky.com/js" type="text/javascript"></script>
<script type="text/javascript">clicky.init(252648);</script>
<noscript><p><img alt="Clicky" width="1" height="1" src="http://in.getclicky.com/252648ns.gif" /></p></noscript>
