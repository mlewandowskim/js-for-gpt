# NodeJS "interpreter" for chatgpt
Environment for NodeJS to run with OpenAI "GPTs".
How it works:

1. Create ngrok account to be able to expose your API to the internet
2. Go to main.js and in API KEY variable add some random string
3. `node main.js`
4. Use ngrok to expose this API to the internet
5. Go to `openapi.json` and change server url to your address
6. Open chatGPT add an **action** to your custom GPT
7. In schema paste the openapi.json content

### Instructing ChatGPT to execute your app here
Example prompt:
> Write a script that opens https://tvn24.pl/ in puppeteer and gets all headlines (H1,H2 HTML tags) and displays it to console. 
> Use executeNodeApp to execute the app and test it out.

This prompt resulted in ChatGPT writing this script:
```
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://tvn24.pl/');

    // Grabbing H1 and H2 headlines
    const headlines = await page.evaluate(() => {
        const h1 = Array.from(document.querySelectorAll('h1')).map(elem => elem.innerText);
        const h2 = Array.from(document.querySelectorAll('h2')).map(elem => elem.innerText);
        return [...h1, ...h2];
    });

    console.log('Headlines:', headlines);

    await browser.close();
})();
```

Which was then successfully executed on my machine.
gl&hf