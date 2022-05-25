'use strict';

const rssParser = require('rss-parser');
const axios = require('axios');
const AWS = require('aws-sdk');

AWS.config.update({region: 'eu-central-1'});
const parser = new rssParser();
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = "nav_rss_feed_items";

const getFeed = async () => {
    return await parser.parseURL('https://onlineszamla.nav.gov.hu/feed/atom.xml?localisation=en');
}

const getAlreadyNotifiedIds = async () => {
    console.log('getting already notified IDs...');
    const alreadyNotifiedItemIds = [];
    try {
        const params = {TableName: TABLE_NAME};
        const dbData = await dynamoDb.scan(params).promise();
        for (let item of dbData.Items) {
            alreadyNotifiedItemIds.push(item.id);
        }
        console.log(alreadyNotifiedItemIds);
        return alreadyNotifiedItemIds;
    } catch (error) {
        console.log('error getting already notified: '+error);
        return alreadyNotifiedItemIds;
    }
}

const notifyToSlack = async (message) => {
    const userMention = process.env.slackMention;
    const slackUrl = process.env.slackUrl;
    const res = await axios.post(slackUrl, {
        text: 'notifyFromRSS: '+userMention+': '+message
    });
    if (res.data !== 'ok') {
        throw new Error('notification for message '+message+' failed')
    }
}

const saveItemToDb = async (id) => {
    return await dynamoDb.put({
        TableName: TABLE_NAME,
        Item: {id: id}
    }).promise();
}

const getFormattedMessage = (messageString) => {
    const linksInSummary = messageString.match(/href\s*=\s*(['"])(https?:\/\/.+?)\1/gi);
    let formattedMessage = messageString.replace(/(<([^>]+)>)/gi, "");
    for (let link of linksInSummary) {
        formattedMessage += '\n '+link.replace('href', '')
            .replace(/"/g, '')
            .replace('=', '')
    }
    return formattedMessage;
}

module.exports.notifyFromRSS = async (event) => {
    console.log('starting notifyFromRSS');
    let feed = {};
    try {
         feed = await getFeed();
    } catch (error) {
        console.error('error getting feed: '+error.message);
        return;
    }
    if (!feed.hasOwnProperty('items') || feed.items.length === 0) {
        console.log('no feed items found');
        return;
    }
    console.log('received feed:');
    console.log('lastBuildDate: ' + feed.lastBuildDate + ', num of items: ' + feed.items.length);
    const alreadyNotifiedIds = await getAlreadyNotifiedIds();
    for (let feedItem of feed.items) {
        if (alreadyNotifiedIds.indexOf(feedItem.id) !== -1) {
            continue;
        }
        let message = feedItem.title+'('+feedItem.pubDate+'): '+getFormattedMessage(feedItem.summary);
        try {
            await notifyToSlack(message);
        } catch (error) {
            console.error('slack notification failed: '+error.message);
            return;
        }
        saveItemToDb(feedItem.id)
            .catch(async (error) => {
                try {
                    await notifyToSlack('saving to dynamoDB failed: '+error.message);
                } catch (error) {
                    console.error('slack notification on dynamoDB save error failed: '+error.message);
                }
            })
    }
};
