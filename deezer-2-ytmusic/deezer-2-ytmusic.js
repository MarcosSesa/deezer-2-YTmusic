import puppeteer from 'puppeteer';
import {credentials} from "./credentials.js";

// Initialize browser
const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const page = await browser.newPage();

// Variables
let deezerSongs = []

// -----------------  DEEZER  --------------------------

// Capture all visible songs rows elements and extract the artist an tittle from each row
async function captureVisibleDeezerSongs() {
    let songsRows = await page.$$('div[role="row"]');
    let songs = await Promise.all(songsRows.map(async (row) => {
        const artistElement = await row.$('a[data-testid="artist"]');
        const artist = await artistElement.evaluate(node => node.textContent);
        const songTitleElement = await row.$('span[data-testid="title"]');
        const songTitle = await songTitleElement.evaluate(node => node.textContent);
        return {title: songTitle, artist: artist};
    }));
    const newSongs = songs.filter(song => {
        return !deezerSongs.some(deezerSong =>
            deezerSong.title === song.title && deezerSong.artist === song.artist
        );
    });
    deezerSongs.push(...newSongs);
}

// Controls the scrolling through the playlist and extract all info till the end of the scroll
async function getDeezerSongs() {
    await page.waitForSelector('div[role="row"]');
    await captureVisibleDeezerSongs();

    let currentHeight = 0;
    let previousHeight = 0;
    const scrollIncrement = 300; // Define tu incremento de scroll

    while (true) {
        await page.evaluate(`window.scrollTo(0, ${currentHeight + scrollIncrement})`);
        await new Promise(resolve => setTimeout(resolve, 500));

        await captureVisibleDeezerSongs();

        previousHeight = currentHeight;
        currentHeight += scrollIncrement;

        const documentHeight = await page.evaluate('document.body.scrollHeight');
        if (currentHeight >= documentHeight) {
            console.log("Se ha alcanzado el final del documento");
            break;
        }

    }

    console.log(deezerSongs.length)
}

//Mange the navigation to the playlist and close the chrome
async function loadDeezerSongs(playList, userMail, userPassword) {
    await page.goto('https://www.deezer.com/es/login').then(async () => {

        //Accept cookies
        await page.locator('#gdpr-btn-accept-all').click()

        //Login
        await page.locator('#login_mail').fill(userMail);
        await page.locator('#login_password').fill(userPassword);
        await page.locator('#login_form_submit').click()

        let userId

        await page.on('response', async (res) => {
            if (res.status() === 200 && res.url().includes('deezer.getUserData') && !userId) {
                res.json().then(async (json) => {
                    userId = json.results.USER.USER_ID
                    await page.goto(`https://www.deezer.com/es/profile/${userId}/loved`).then(async () => {
                        await page.locator('.chakra-modal__close-btn').click();
                        await getDeezerSongs()
                    })
                    setTimeout(() => {
                        browser.close();
                    }, 4000)
                })
            }
        })

    });

}

// -----------------  YT Music  --------------------------

async function uploadSongsToYTMusic(ytMail) {
    await page.goto('https://accounts.google.com/').then(async () => {

        await page.waitForSelector('input[type="email"]')
        await page.locator('input[type="email"]').fill(ytMail);
        await page.locator('.TNTaPb').click()
        await page.locator('input[type="password"]').fill(ytMail);
        await page.locator('.TNTaPb').click()


    });
}

//MAIN

await loadDeezerSongs('', credentials.deezerMail, credentials.deezerPassword)
await uploadSongsToYTMusic(credentials.ytMail)
setTimeout(() => browser.close(), 30000)