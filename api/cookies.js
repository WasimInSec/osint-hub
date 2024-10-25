import axios from 'axios';
import puppeteer from 'puppeteer';
import middleware from './_common/middleware.js';

const getPuppeteerCookies = async (url) => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    const navigationPromise = page.goto(url, { waitUntil: 'networkidle2' });
        const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Puppeteer took too long!')), 3000)
    );
    await Promise.race([navigationPromise, timeoutPromise]);
    return await page.cookies();
  } finally {
    await browser.close();
  }
};

const cookieHandler = async (url) => {
  let headerCookies = null;
  let clientCookies = null;

  try {
    const response = await axios.get(url, {
      withCredentials: true,
      maxRedirects: 5,
    });
    headerCookies = response.headers['set-cookie'];
  } catch (error) {
    if (error.response) {
      return { error: `Request failed with status ${error.response.status}: ${error.message}` };
    } else if (error.request) {
      return { error: `No response received: ${error.message}` };
    } else {
      return { error: `Error setting up request: ${error.message}` };
    }
  }

  try {
    clientCookies = await getPuppeteerCookies(url);
  } catch (_) {
    clientCookies = null;
  }

  if (!headerCookies && (!clientCookies || clientCookies.length === 0)) {
    return { skipped: 'No cookies' };
  }

  return { headerCookies, clientCookies };
};

export const handler = middleware(cookieHandler);
export default handler;
