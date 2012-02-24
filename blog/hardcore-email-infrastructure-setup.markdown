---
title: Email infrastructure setup guide
layout: post
---

# Email infrastructure setup guide

*Disclaimer: this article will help you ensure that your 'good' emails will not get into spam folder. If you are sending junk emails with viagra advertisement sooner or later you'll get in trouble anyway.*

In this article you will get a brief overview of things you can do to increase the quality of email subsystem of your application.

* Preliminary one-time infrastructure setup
		* [IP's PTR Record](#ptr)
		* [Domain's SPF record](#spf)
    * [DKIM keys](#dkim)
    * [Validating setup programmatically](#validation)
* On-going support
    * [Handling bounces](#bounces)
    * [Handling bounces with Ruby on Rails](#bounces_rails)
    * [Parsing MTA logs](#parsing)
* What else to do

## Preliminary infrastructure setup

The basic question that any email receiving server should answer when it gets email sounds like this: ok, I got an email from this IP and it claims that is was sent from this domain, is it true? There are several ways to check it and usually it's better to satisfy all of this checks because they are executed one by one in the same order they are presented here. Failing one check will lead to failing the whole chain and removing email sent by your application from mailbox.

<a name="ptr">
	
</a>

### IP's PTR record

PTR record allows one to do a reverse lookup of IP address and find the domain bind to this IP address. This is the most trivial thing every mail server can do to ensure that the email was sent from your domain. You should setup it for an IP address of your server that sends emails. It should look like this:

    [your ip in reversed order].in-addr.arpa. IN PTR your-domain.com.

You can validate this setup using standard unix `dig` utility

    $ dig +short -x [your ip]
    your-domain.com.

<a name="spf">
	
</a>

### Domain's SPF record

SPF (Sender Policy Framework) record allows listing trusted IP addresses that could send emails under the name of your domain and provide set of rules to email server on how to deal with failed ones. SPF uses its own macrolanguage and could look cryptic, but under the hood it's really simple and smart thing. SPF record goes to TXT record of your domain[*](#spf_record) and mail server will fetch it from there (that's why you have to setup PTR record correctly). The simplest and most common example could look like this:

    v=spf1 ip4:207.97.227.239 -all

In plain english it means: allow emails sent from 207.97.227.239 and reject others. If you're managing application with one IP you can go with this form of record and advance to the next section.

For more advanced usage you'll have to understand the basics of SPF. It consists of two main components: mechanisms and qualifiers. Mechanism is a way of finding ip addresses. There are several built-in mechanisms: like listing ip addresses one by one or specifying DNS record from which this addresses should be fetched. Qualifier specifies the action that should be taken on email sent from address fetched by mechanism. There are 4 available:

* `+` - accept, this is default prefix, so it can be omitted
* `-` - reject, the server will not even fetch the body of email sent from prefixed address
* `?` - neutral, the mail server could decide itself whether it should reject message, mark it as spam or ignore check
* `~` - soft-fail, email would be accepted but marked as spam

One important thing that you should understand about SPF check is that it's performed *before* receiving the message body, so if message got rejected - the mail server will not even fetch your message body and won't advance with further checks.

If you manage several domain names that are still part of one big application or belong to one company you can do a slightly more advanced trick using `include` mechanism or `redirect` modifier. For example your main domain is `foo.com` and you have several auxiliary domains like `foo.us` and `foo.eu`. In this case you can setup SPF record for main domain and then include this record for auxiliary domains.

For main domain you can go with:

    v=spf1 ip4:222.111.222.1 ip4:222.111.222.2 ip4:222.111.222.3 -all

And for auxiliary domains you can set SPF to the following value:

    v=spf1 include:foo.com ~all

In this case you can manage your email policies from one place and other domains will pick it up automatically. There is a big difference between `redirect` and `include`: `redirect` completely rewrites SPF with included one and `include` just includes contents into SPF record during evaluation process. 

If you want to dive deeper I recommend you to take a look into [SPF record syntax specification](http://www.openspf.net/SPF_Record_Syntax).

<a name="dkim">
	
</a>

### DKIM (DomainKeys Identified Mail)

DKIM is the most powerful method to avoid false spam fails. Unlike SPF method it checks the email body and headers for integrity and correctness. In a few words it works the following way:

1. When email is sent it's signed with private key stored on your server and signature is put into email header
2. Email server that received email fetches public key from your domain's DNS record and validates signature & data against it

DKIM itself wasn't developed to deal with the spam so it doesn't carry any directives but almost all big email providers mark emails with failed DKIM signatures as spam and the most important thing about DKIM - it works backwards too - so if your email is signed with DKIM signature it's a big advantage and most likely it won't be marked as spam.

To setup Postfix MTA to sign your emails you can follow this steps (Other MTAs would have more or less similar setup)

1. Install [`dkim-filter`](https://help.ubuntu.com/community/Postfix/DKIM) package.
2. Configure Postfix to route emails through `dkim-filter`.

        # /etc/postfix/main.cf
        smtpd_milters = inet:localhost:8891
        non_smtpd_milters = inet:localhost:8891

3. Generate key pair for your domain

        $ dkim-genkey -d your-domain.com -s your-domain.com -r

4. Tell `dkim-filter` to sign emails that goes from specified domain

        *@your-domain.com:your-domain.com:/etc/postfix/dkim/your-domain.com

5. Put generated public key into TXT record of your domain.

        $ dig +short TXT your-domain.com._domainkey.your-domain.com
        v=DKIM1; g=*; k=rsa; p=MIGfMA0G.........

The easiest way to verify setup is to send an email to any Gmail account and then take a look into original message. Gmail will explicitly show the result of DKIM check.

<a name="validation">

### Validating your setup programmatically

If you need to validate setup programmatically within your application you can go with [`domain_info`](https://github.com/iafonov/domain_info) ruby gem. It was created specifically for the purposes of validating email infrastructure setup. It features simple and straightforward interface and doesn't have any external dependencies. 

    domain = DomainInfo::Domain.new("github.com")

    # IP
    domain.ip                     # => "207.97.227.239"

    # PTR record validation
    domain.ptr.value              # => "github.com"
    domain.ptr.present?           # => true
    domain.ptr.valid?             # => true, domain's ip resolves to itself

    # Extracting SPF record
    domain.spf.value              # => v=spf1 a mx include:spf.mtasv.net...
    domain.spf.present?           # => true

    # Extracting DKIM public key
    domain.dkim("_key").value     # => v=DKIM1...
    domain.dkim("_key").present?  # => true

    # Extracting DKIM record with defaut name usually generated by dkim-filter
    domain.default_dkim.value     # => v=DKIM1...

## On-going support


<a name="bounces">
	
</a>

### Handling bounces

Bounce is an automatically generated email send to you by one of relaying email servers when delivery can't be performed or something went wrong during delivery. You can think of them as an exceptions in programming. Bounces are delivered to the address extracted from `return-path` header of original email. Automated processing of bounces is quite critical task if you're doing mass email newsletter sending because of the following reasons:

* It allows you to maintain quality of your subscribers list. You can easily track and clear obviously incorrect emails like `qwe@qwe.com` or emails with bad syntax (if you somehow f'cked up with your very own custom validation regex).
* You can automatically unsubscribe users who don't want to see your emails and press `Spam` button in their inbox or delete messages without opening them.

To setup your infrastructure to handle bounces you'll have to do the following steps:

* Tag every email with unique id and put it into `return-path` address. For example it could look like `token@e.your-server.com`
* Store all emails somewhere in database or kv-store (as a free bonus on the same infrastructure you can easily build email tracking subsystem)
* Tell your MTA to forward all emails received to `@e.your-server.com` mailbox to `bounce@your-server.com`
* Setup a background job to read and process this aggregated mailbox. Depending on your application specifics you can either completely remove bounced email addresses or just mark them as unsubscribed.

For the most situations just the fact that you've received bounce means that you shouldn't continue sending emails to this address, but strictly speaking you can parse bounce email and get the reason of the bounce. Bounces usually fall into two categories soft bounces and hard bounces. Hard bounce means that email address you're trying to send email is invalid. With soft bounces you can try to send email later but in practice soft bounces are very rare and in most cases it's easier to treat them as hard bounces.

<a name="bounces_rails">
	
</a>

### Handling bounces with Ruby

If you're running rails application you can read emails either by setting up receive method in mailer class or do processing manually. Setting up callback isn't a good idea if you're sending a lot of emails because to process every email a new instance of application will be spawned which could easily kill performance. I recommend to go with background job and manually process bounces. Here is a snippet of code that could be used to process bounce mailbox:

    def process_mailbox
      config = BouncerConfiguration.load

      pop = Net::POP3.new(config['host'])

      pop.start(config['username'], config['password'])
      pop.delete_all do |m|
        token = extract_token(m.pop)
        # find email and unsubscribe it
        BouncedEmailHandler.handle(token)
      end

      pop.finish
    end

    def extract_token(email_address)
      # extract token from string like 26027b62de9ba2ac500fe0a66002d7f1@e.yourdomain.com
    end

<a name="parsing">

</a>

### Parsing MTA log

If postfix can't deliver email usually it would put it into its [deferred queue](http://www.postfix.org/QSHAPE_README.html#deferred_queue) and say something in log (usually `/var/log/mail.info`). Parsing logs could be supplementary task to handling bounces.

		Feb 24 07:03:33 server postfix/smtp[16521]: AE7E2BEC401: to=<typo@hot-mail.com>, relay=none, delay=95123, delays=95095/0.09/28/0, dsn=4.4.3, status=deferred (Host or domain name not found. Name service error for name=hot-mail.com type=MX: Host not found, try again)

## What else to do

This article covers only basic things you can do to increase your email delivery percentage. It doesn't cover things like dealing with blacklists, warming up your IPs etc. I really recommend you to take a look into awesome [Mailchimp's guide about email delivery](http://mailchimp.com/resources/guides/html/email-delivery-for-it-professionals/) it quickly goes through almost all possible aspects of email delivery.

<a name="spf_record"></a>\* *There is a special DNS record for SPF record but its not adopted everywhere so it is better to have TXT record or both*