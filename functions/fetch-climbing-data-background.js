const puppeteer = require('puppeteer-core')
const chrome = require('@sparticuz/chromium')
const { Base64 } = require('js-base64')
const { Octokit } = require('@octokit/rest')

const USERNAME_SELECTOR = '#username'
const PASSWORD_SELECTOR = '#password'
const CTA_SELECTOR = '#kc-login'
const SERVICE_HOST = 'https://www.8a.nu'
const SERVICE_PATH = `/api/users/${process.env.HEIGHT_A_NU_SLUG_USERNAME}/ascents`
const SERVICE_QS =
    '?category=sportclimbing&pageIndex=0&pageSize=100&sortField=grade_desc&timeFilter=0&gradeFilter=0&typeFilter=&isAscented=true&searchQuery=&showRepeats=false'
const GITHUB_OWNER = 'myarcane'
const GITHUB_REPO = 'my-climbing-stats'
const JSON_PATH = 'my-climbing-stats.json'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_EMAIL = process.env.GITHUB_EMAIL

const getOptions = async (isDev) => {
    console.log({ isDev })
    if (isDev) {
        return {
            executablePath: process.env.CHROME_EXCECUTABLE_PATH,
            headless: true,
            args: [],
        }
    }
    return {
        args: chrome.args,
        executablePath: await chrome.executablePath,
        headless: chrome.headless,
    }
}

const startBrowser = async () => {
    const options = await getOptions(
        process.env.URL.includes('http://localhost')
    )
    const browser = await puppeteer.launch(options)
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

const closeBrowser = async (browser) => {
    return browser.close()
}

const getAndWrite8AStats = async () => {
    const { browser, page } = await startBrowser()
    page.setViewport({ width: 1366, height: 768 })
    await page.goto(SERVICE_HOST)
    await page.waitForNavigation()

    const bodyHTML = await page.evaluate(
        () => document.documentElement.outerHTML
    )

    console.log({ bodyHTML })

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

    console.log({ jsonData })

    closeBrowser(browser)
    return { climbingStats: jsonData }
}

const writeClimbingStatsToGithub = async (climbingStats) => {
    try {
        const octokit = new Octokit({
            auth: GITHUB_TOKEN,
        })

        const {
            data: { sha },
        } = await octokit.rest.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: JSON_PATH,
        })

        await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: JSON_PATH,
            sha,
            message: 'Save climbing stats programmatically',
            content: Base64.encode(climbingStats),
            committer: {
                name: 'myarcane',
                email: GITHUB_EMAIL,
            },
            author: {
                name: 'myarcane',
                email: GITHUB_EMAIL,
            },
        })
        console.log('Success updating climbing stats')
    } catch (err) {
        throw new Error('Failure updating climbing stats', err)
    }
}

exports.handler = async function (event, context) {
    const { climbingStats } = await getAndWrite8AStats()
    await writeClimbingStatsToGithub(climbingStats)
}
