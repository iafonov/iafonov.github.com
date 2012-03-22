---
title: Deploying rails application with chef - complete walkthrough
layout: post
---

# Deploying rails application with chef - complete walkthrough

<div class="date">[16 Mar 2012]</div>

Chef is a systems integration framework. It is open-source and baked by Opscode Inc. Chef will help you not only do one-click deployments but morover to control and store the full confiuguration of your infrastructure. Using chef with chef server for a small infrastructures (like having 1 server for all) could seem to be overkill from the beginning but you would be rewarded if you'll decide to expand your infrastructure, copy it or even simply move your server.

* [Prerequisites](#prerequisites)

I'm assuming that you have a rails application and server you want to do a deploy to. I'm assuming that server has a clean installation of ubuntu server. If you're going to use another distribution in most cases it means that you know what you're doing and you'd be able to do the similar steps.

* [Setting up chef server](#chef-server)

		$ echo "deb http://apt.opscode.com/ `lsb_release -cs`-0.10 main" | sudo tee /etc/apt/sources.list.d/opscode.list
		$ sudo mkdir -p /etc/apt/trusted.gpg.d
		$ gpg --fetch-key http://apt.opscode.com/packages@opscode.com.gpg.key
		$ gpg --export packages@opscode.com | sudo tee /etc/apt/trusted.gpg.d/opscode-keyring.gpg > /dev/null
		$ sudo apt-get update
		$ sudo apt-get install opscode-keyring
		

* [Creating chef repository](#chef-repo)
* [Setting up apache and passenger](#apache)
* [Setting up deployment](#deployment)
* [Simplifying deployment](#deployment2)

