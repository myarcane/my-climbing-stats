const chromium = require('chrome-aws-lambda')
const puppeteer = require('puppeteer-core')

const fs = require('fs')

const USERNAME_SELECTOR = '#username'
const PASSWORD_SELECTOR = '#password'
const CTA_SELECTOR = '#kc-login'
const SERVICE_HOST = 'https://www.8a.nu'
const SERVICE_PATH = `/api/users/${process.env.HEIGHT_A_NU_SLUG_USERNAME}/ascents`
const SERVICE_QS = '?category=sportclimbing'

async function startBrowser() {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath:
            process.env.CHROME_EXCECUTABLE_PATH ||
            (await chromium.executablePath),
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
    })

    const page = await browser.newPage()

    // set extra headers to avoid bot detection.
    page.setExtraHTTPHeaders({
        'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        'upgrade-insecure-requests': '1',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'en-US,en;q=0.9,en;q=0.8',
    })

    return { browser, page }
}

async function closeBrowser(browser) {
    return browser.close()
}

async function getAndWrite8AStats() {
    const { browser, page } = await startBrowser()
    page.setViewport({ width: 1366, height: 768 })
    await page.goto(SERVICE_HOST)
    await page.waitForNavigation()

    const bodyHTML = await page.evaluate(
        () => document.documentElement.outerHTML
    )
    console.log('body HTML', bodyHTML)

    // Gets the 8a.nu login button
    const linkHandlers = await page.$x("//a[contains(text(), 'Log in')]")
    if (linkHandlers.length > 0) {
        await linkHandlers[0].click()
    } else {
        throw new Error('Login link not found')
    }

    await page.waitForNavigation()
    await page.click(USERNAME_SELECTOR)
    await page.keyboard.type(process.env.HEIGHT_A_NU_USERNAME)
    await page.click(PASSWORD_SELECTOR)
    await page.keyboard.type(process.env.HEIGHT_A_NU_PASSWORD)
    await page.click(CTA_SELECTOR)
    await page.waitForNavigation()
    await page.goto(`${SERVICE_HOST}${SERVICE_PATH}${SERVICE_QS}`)
    const jsonData = await page.evaluate(() => {
        return document.querySelector('body').innerText
    })

    console.log('Saving sports climbing data', jsonData)
    fs.writeFileSync('my-sports-climbing-data.json', jsonData)
    return browser
}

;(async () => {
    const browser = await getAndWrite8AStats()
    closeBrowser(browser)
    process.exit(1)
})()
