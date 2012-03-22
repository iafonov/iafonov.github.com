---
title: Pragmatic infrastructure setup verification with cucumber and chef
layout: post
---

# Pragmatic approach to infrastructure setup verification & testing with chef and cucumber

<div class="date">[21 Mar 2012]</div>

## The problem

I'm using [Opscode chef](http://www.opscode.com/chef/) for managing and automation of rails application infrastructure. Currently we have 5 application shards and several auxiliary nodes for staging/CI purposes. As our infrastructure is constantly growing we started experience regression problems. When you have one node and something goes wrong you can quickly ssh to it and fix it manually - but when you do a deployment to 5 nodes simultaneously and something goes wrong - that could be a huge problem.

I've never considered myself as a system administrator and never worked in such role - but projecting my developer's experience to the problem the first and the most obvious solution that came into my mind was - we need tests.

I've reviewed several [existing](https://github.com/Atalanta/cucumber-chef) [tools](https://github.com/hedgehog/cuken) but I haven't found anything that would satisfy me. The common problem with these tools, in my opinion, is their sometimes overkill complexity and limitations. Chef itself is a complex tool and adding additional complexity makes it practically unusable.

The only way that I've found was to figure out something myself. Here is the list of things that I wanted to get from my testing tool:

* It should be simple and straightforward (Extremely important point for me)
* I'm big fan of cucumber - so I want to write tests using it
* It should be a good regression testing tool - I want to know when I'll unintentionally break something
* Maybe I'd want to use it to develop infrastructure in test first manner
* I don't want to have a separate tool - I want it to be seamlessly integrated into existing chef infrastructure

## The solution

After thinking about it for several days I decided that it is time to do something. It took several hours to build a simple tool that completely satisfied me. This tool is a chef cookbook that does two main things: it copies test suite to a target node and sets chef handler that fires after `chef-client` run and executes this test suite.

Such approach is perfect for regression testing and acceptance tests.

This thing is open sourced and you can find it on github - [https://github.com/iafonov/simple_cuke](https://github.com/iafonov/simple_cuke)

## How it works

The main idea begind implementation is to keep it as simple as possible. So here are all three steps that are taken to run tests:

1. Cookbook's default recipe synchronizes the `files/default/suite` cookbook's folder with remote node via calling `remote_directory` LWRP
2. [Chef handler](http://wiki.opscode.com/display/chef/Exception+and+Report+Handlers) is registered
3. When handler is executed it installs the bundle (it consists of cucumber & aruba) and runs cucumber features

## Test suite

Test suite is basically a set of cucumber features. In these features you can test whatever you want - for example you can test whether daemon is running or uploads directory is writeable by the user responsible for running the application.

The cookbook will automatically install and link [aruba](https://github.com/cucumber/aruba/) gem for you. Aruba is a set of handy cucumber steps that are intended to test CLI applications and test manipulation with file system. This is exactly what is needed during verification of infrastructure setup. You can see the full list of steps [here](https://github.com/cucumber/aruba/blob/master/lib/aruba/cucumber.rb)

There is no limitations on using custom steps - you can use your own defined steps. Put the step definitions into `features/step_definitions/file_steps.rb` file and they would be loaded automatically. 

Add role name as tag to the scenario or feature and it would be run only on nodes that have this role. Features/scenarios without tags would be run always.

## Examples of tests

Trivial example - here we check that apache process appears in `ps` output. Both steps are aruba's standard steps so you don't have to write your own step definitions. This feature would be run only on nodes that have role `appserver` in their run list.

    @appserver
    Feature: Application server

    Scenario: Apache configuration check
      When I successfully run `ps aux`
      Then the output should contain "apache"

Slightly more advanced example - lets check that services are running, bind to their ports and aren't blocked by firewall:

    Feature: Services

    Scenario Outline: Service should be running and bind to port
      When I run `lsof -i :<port>`
      Then the output should match /<service>.*<user>/

      Examples:
        | service | user     | port |
        | master  | root     |   25 |
        | apache2 | www-data |   80 |
        | dovecot | root     |  110 |
        | mysqld  | mysql    | 3306 |

    Scenario Outline: Service should not be blocked by firewall
      When I run `ufw status`
      Then the output should match /<service>.*<action>/

      Examples:
        | service | action |
        | OpenSSH |  ALLOW |
        | Apache  |  ALLOW |
        | Postfix |  ALLOW |

## Setting up

1. Install cookbook to your chef repo. (`git clone git://github.com/iafonov/simple_cuke.git cookbooks/simple_cuke`)
2. Add `recipe[simple_cuke]` to run_list
3. Start writing cucumber features and put them to `files/default/suite/features` folder
4. Run `chef-client` and enjoy

## My workflow

Chef is in charge of full control of application's infrastructure including deployment. Every time we do deployment `chef-client` converges node and deploys a new version of application. I don't run `chef-client` periodically in the background, the run could be triggered only manually. I use combination of rake & knife scripts to do a deployment. All I need to do is run `rake deploy:production` from the chef repo. With this setup after each successful run the test suite is run and I'm presented with its results.

## Under the hood

Here is pretty self-explanatory list of files that are in charge of testing your node setup:

    verify_handler.rb
    suite/
    - Gemfile
    - Gemfile.lock
    - features/
      - env.rb
      - step_definitions/


The cookbook uses [bundler](http://gembundler.com/) to setup test environment on the remote node. If you open `files/default` cookbook's folder you'll see Gemfile and Gemfile.lock files. Potentially you can add your own gems to it and use them during testing. You can even get rid of cucumber and use rspec or your favorite testing framework.

You can edit command that triggers test run in `verify_handler.rb` file.

## Future development

For now tests result goes to stdout that makes it practically unusable if you're running `chef-client` periodically in background. I'm thinking about adding ability to define custom reporters that could for example send test results to email or accumulate them in file.
