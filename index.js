const puppeteer = require('puppeteer');

async function scrapeQuotit(applicant) {
    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();

    await page.goto('https://www.quotit.net/eproIFP/webPages/infoEntry/InfoEntryZip.asp?license_no=M5S66R');

    await page.type('#zipCode', zipcode);


    //search for labels and with values

    let options = await page.evaluate(() => {
        const result = {};

        const tdElements = Array.from(document.querySelectorAll('td'));

        for (const tdElement of tdElements) {
            if (tdElement.textContent.trim().includes('Plan Type')) {
                const sibling = tdElement.nextElementSibling;

                const labelElements = Array.from(sibling.querySelectorAll('label'))
                    .map(el => {
                        return {
                            label: el.textContent.replaceAll('\n', ' ').replace(/  +/g, ' ').trim(),
                            value: el.querySelector('input').value
                        }
                    });
                return labelElements;
            }
        }
    });

    console.log(options);

    await page.click(`input[name="covTypeID"][value="${options[1].value}"]`);

    // const buttonSelector = 'a[class="btn float-right"]';
    const buttonSelector = 'a.btn.float-right';
    await page.waitForSelector(buttonSelector);
    await page.click(buttonSelector);

    await page.waitForNavigation();

    await page.waitForSelector('iframe');

    const iframeHandle = await page.$('iframe');

    const iframe = await iframeHandle.contentFrame();

    await iframe.type('#applicantFirstName', applicant.firstName);
    await iframe.type('#applicantLastName', applicant.lastName);
    await iframe.type('#applicantEmail', applicant.email);
    await iframe.type('#applicantPhone', applicant.phone);
    await iframe.type('#applicantState', applicant.state);
    await iframe.type('#applicantCity', applicant.city);
    await iframe.type('#applicantStreetAddress', applicant.streetAddress);
    await iframe.type('#applicantComments', applicant.comments);
    await iframe.waitForSelector(buttonSelector);
    await iframe.click(buttonSelector);

    await browser.close();
};

(async () => {
    const applicant = {
        firstName:'John',
        lastName: 'Doe',
        email: 'johndoe@gmail.com',
        phone: '1234567890',
        streetAddress: '123 Main St',
        city: 'Los Angeles',
        state: 'CA',
        zipcode:'90048',
        comments: 'This is a comment'
    }
    membersInHouse = 5; //range on site is: 1-10
    await scrapeQuotit(applicant);
})();


