
# The Shoppies
![Screenshot of The Shoppies](https://i.imgur.com/F41c4uS.png)
### Built for the Shopify UX Developer Intern & Web Developer Intern Challenge - Summer 2021

[https://shopify-frontend-challenge.netlify.app/](https://shopify-frontend-challenge.netlify.app/)

### Key Features
 - Search and nominate any movie available on OMDB 
 - Infinite "scroll" of search results
 - Nomination list caching using Local Storage
 - Toasts, banners, empty states, and loading states
 - Built using Shopify's Polaris Design System
 - Hosted on Netlify, automatically deploys off of Github
 - Fully responsive
 - Scores 100 in accessibility and best practices on Lighthouse 6.4.0

### Room for Improvement
There's a few things that could be improved on with more time

 - Using Typescript instead of plain JS for more type safety
 - Allowing users to save and share their nomination lists using a social login provider and some sort of database (Firestore)
 - The Polaris `ResourceItem` component's `shortcutActions` rely on a hover state to show the actions unless they are persisted. It's not possible for a touch device user to hover, thus, these actions are inaccessible to users on touch devices
	 - I ended up using a button in the `ResouceItem` itself rather than the built-in `shortcutActions` so that they'd be accessible on mobile and styled appropriately 
 - Cleaning up `app.js` in if the project were to have more pages/components
