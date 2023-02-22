# my-climbing-stats

Small puppeteer helper to scrape my own climbing data (ascents etc) from **8a.nu** on a daily basis.

## Initial need

I wanted to be able to save my climbing data in case **8a.nu** service would not be accessible anymore.

## Technical stack

-   **8a.nu** doesn't provide any open rest api so I used **puppeteer** to be able to scrape my own climbing data.

-   I used netlify's **serverless functions** to schedule the scraping.

-   The package [@sparticuz/chromium](https://github.com/Sparticuz/chromium) helped me to deploy a chromium version compatible with **netlify aws lambda** and [puppeteer core](https://www.npmjs.com/package/puppeteer-core). As a side note, I was not successful in production using [chrome-aws-lambda](https://www.npmjs.com/package/chrome-aws-lambda).

-   The package [@octokit/rest](https://github.com/octokit/rest.js) helps me to automatically commit my climbing data on this repository.

## Next steps

-   Build a little page to show my climbing data
-   Migrate code from JS to TS
