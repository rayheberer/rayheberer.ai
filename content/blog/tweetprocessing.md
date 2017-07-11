---
author: Ray Heberer
date: 2017-07-11
linktitle: Twitter's Tweet Processing - Reply To and Quote Tweets with the API
title: Twitter's Tweet Processing - Reply To and Quote Tweets with the API
tags: [Twitter, API, R, twitterbot, iXperience]
highlight: true
---

### Motivation

Last month I built a [twitterbot](https://github.com/rayheberer/twitterbot), that I haven't really talked about much because the project is not at a point yet where I'm proud of it. One major challenge I had was getting my bot to respond to, and quote (retweet) tweets.

![](/img/retweetreply.png)
*A reply and a quoted tweet (retweet)*

I am using the [twitteR](https://cran.r-project.org/web/packages/twitteR/index.html) package as an interface for interacting with the [Twitter API](https://dev.twitter.com/overview/api). According to the author of twitteR, it is now in a "leisurely deprecation period," and people should begin to switch over to [rtweet](https://github.com/mkearney/rtweet). However, twitteR works quite well and conveniently takes care of all the steps in the OAuth dance with one handy function.

The function I was using to update the status of my twitterbot was twitteR::updateStatus(). The problem I was running into was that simply passing in a value to the inReplyTo argument would not work as intended.

Suppose I wanted to respond to [this tweet](https://twitter.com/elonmusk/status/884580654117076992), with ID "884580654117076992."

Assuming I've already gone through the authentication steps...

```
library(twitteR)
updateStatus('Hello!', inReplyTo = 884580654117076992)
```

![](/img/hello.png)

Clearly, that didn't work as intended.

### Twitter's Tweet Processing

I can't really say how I arrived at the workaround to this problem. By collecting clues from pages like [Twitter SMS Commands](https://support.twitter.com/articles/14020) and [Twitter's Link Service](https://support.twitter.com/articles/109623) I had some directions to pursue using trial and error. It just so happened that I succeeded after just a couple trials.

Briefly, if you tweet through SMS and prepend a twitter handle to your tweet, you will respond to that person. Also, if you include a link in a tweet, it will automatically be shortened to something in http://t.co.

Now, there's no reason to expect this to have a correspondence to tweeting using the function in the twitteR package, but it does. Shown below are ways of responding to and quoting tweets, where the "twt" argument is a status object from the twitteR package.

```
retweet = function(twt, comment=NULL) {
  url = paste0('https://twitter.com/', twt$screenName, '/status/', twt$id)
  updateStatus(paste(comment, url), bypassCharLimit = TRUE)
}

reply = function(twt, content) {
  content = paste0("@", twt$screenName, " ", content)
  updateStatus(content, inReplyTo = twt$id)
}

tweet = searchTwitter('turtles', n = 5, lang = "en")
tweet = strip_retweets(tweet)
# this is a list, must double index to get the status object

retweet(tweet[[1]])
reply(tweet[[2]], 'Cool!')
```

![](/img/replyretweet.png)

Notice how Twitter's tweet processing changes the content included in the API request. There is no @*screenName* in the reply, and no explicit URL in the retweet. Unfortunately, "retweeting" in this way does not increment the retweet counter as far as I know, but it's still a decent workaround.

To quote with a comment using the function defined above, simply do the following:

```
retweet(tweet[[3]], "Tubular!")
```

![](/img/retweetcomment.png)

Hope this helps! Before I forget, let's say hello properly to our buddy Mr. Musk.

```
content = paste("@elonmusk", "Hello!")
updateStatus(content, inReplyTo = 884580654117076992)
```

![](/img/helloelon.png)