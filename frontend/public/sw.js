self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/logo.png',
      badge: '/logo.png',
      data: {
        conversationId: data.conversationId,
        messageId: data.messageId,
        url: `/?conversation=${data.conversationId}`
      },
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const data = event.notification.data;
  
  if (event.action === 'reply') {
    // Handling reply from web push notification is tricky because we can't easily show a prompt in the background.
    // We open the app to the conversation with an intent to reply.
    event.waitUntil(
      clients.openWindow(data.url + '&action=reply&messageId=' + data.messageId)
    );
  } else if (event.action === 'react') {
    // Send reaction in the background
    event.waitUntil(
      fetch('/api/messages/' + data.messageId + '/reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ emoji: '👍' })
      })
    );
  } else {
    // Normal click, just open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        if (clientList.length > 0) {
          let client = clientList[0];
          for (let i = 0; i < clientList.length; i++) {
            if (clientList[i].focused) {
              client = clientList[i];
            }
          }
          return client.focus();
        }
        return clients.openWindow(data.url);
      })
    );
  }
});
