/* Firebase config is passed at registration time; all values are public web config. */
importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging-compat.js');

const encodedConfig = new URL(self.location).searchParams.get('config');
if (encodedConfig) {
  firebase.initializeApp(JSON.parse(atob(encodedConfig)));
  firebase.messaging();
}
