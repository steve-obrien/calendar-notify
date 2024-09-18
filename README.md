# Calendar Nagger 🔊📣

Problem this solves - you can play music and turn notifications off - and if you have a meeting you will be nagged.

Silly script to announce over your speakers that you are supposed to be in a meeting!

You have to go onto Google Cloud API.

And download the OAuth credentials.json


credentials.json:

```json
{
	"installed": {
		"client_id": "950384888835-v939ncir4ardmvclkcog03puccsn111b.apps.googleusercontent.com",
		"project_id": "newicon.net:api-project-950384888835",
		"auth_uri": "https://accounts.google.com/o/oauth2/auth",
		"token_uri": "https://oauth2.googleapis.com/token",
		"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
		"client_secret": "YOUR_CLIENT SECRET",
		"redirect_uris": [
			"http://localhost:3000/oauth2callback"
		]
	}
}
```