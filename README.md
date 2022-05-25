# Info

This project serves as a Slack notification service for news from NAV Online Invoice system.

## Detailed info

* The service is designed to run as AWS lambda - scheduled for every 60 minutes 
* Each run online RSS feed is taken from https://onlineszamla.nav.gov.hu/feed/atom.xml?localisation=en
* Feed is parsed and in case of new item (compared with DynamoDB records)
a Slack notification is sent to a specific webhook
* New item is added to the DynamoDB table

### Configuration

* all configuration regarding AWS is in `serverless.yml`
* app-specific configuration:
  * `slackUrl` -> lambda ENV variable, needs to be set for the lambda to work.
  Should contain a webhook url (`https://...`)
  * `slackMention` ->  lambda ENV variable, needs to be set for the lambda to work.
 Should contain a Slack mention literal (`<@U...>`)
 
# How to install

* ensure you have a working connection with AWS cli https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html#cli-configure-quickstart-config
* deploy all code and configuration to AWS
```
  serverless deploy -v
```
* set ENV variables on `gb-rss-feed-to-slack` lambda (Configuration tab in AWS
web console)

# Logs

## AWS Cloudwatch
```
/aws/lambda/gb-rss-feed-to-slack
```

# Data storage

## AWS DynamoDB

table
```
nav_rss_feed_items
```

# Scheduling

## AWS EventBridge

Defined in `serverless.yml`# serverless-example-app
