const puppeteer = require('puppeteer');



async function selectZipCodeCountyAndPlan(page, applicant, countySelection, planTypeSelection) {

    await page.type('#zipCode', applicant.zipcode);

    const expectedResponseUrl = 'https://www.quotit.net/eproIFP/county.asp';
    await page.waitForResponse((response) => {
        return response.url().startsWith(expectedResponseUrl);
    });

    await page.waitForSelector('select[name="countyID"]');

    await new Promise((resolve)=> setTimeout(resolve, 1000));

    await page.evaluate((countySelection) => {
        const select = document.querySelector('select[name="countyID"]');
        select.value = countySelection.value;
    }, countySelection);

    await page.click(`input[name="covTypeID"][value="${planTypeSelection.value}"]`);

    // const buttonSelector = 'a[class="btn float-right"]';
    const buttonSelector = 'a.btn.float-right';
    await page.waitForSelector(buttonSelector);
    await page.click(buttonSelector);

    await page.waitForNavigation();
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
        zipcode:'77494',
        comments: 'This is a comment'
    }

    const membersInHouse = 5;
    const householdIncome = 60000;

    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();

    await page.goto('https://www.quotit.net/eproIFP/webPages/infoEntry/InfoEntryZip.asp?license_no=5B3WWR');

    const stateCountyList = await getCountyAndStates(page, applicant.zipcode);

    const planTypes = await getPlanType(page);

    const planTypeSelection = planTypes[1];
    const countySelection = stateCountyList.countyOptions[1];
    //range on site is: 1-10
    await selectZipCodeCountyAndPlan(page, applicant, countySelection, planTypeSelection);

    const productTypes = await getProductTypes(page);

    const productTypeSelection = productTypes[1];

    const coveredMembers = [
        {
            firstName : "ChildOne",
            relationship: "Child",
            gender: "M",
            dob: "01/01/2012",
            zipCode: "77494",
            county: stateCountyList.countyOptions[1]
        },
        {
            firstName : "ChildTwo",
            relationship: "Child",
            gender: "M",
            dob: "01/01/2012",
            zipCode: "77494"
        },
        {
            firstName : "ChildThree",
            relationship: "Child",
            gender: "M",
            dob: "01/01/2012",
            tobaccoDate: "02/02/2021",
            zipCode: "77494"
        },
        {
            firstName : "ChildFour",
            relationship: "Child",
            gender: "M",
            dob: "01/01/2012",
            tobaccoDate: "02/02/2021",
            zipCode: "77494"
        }
    ];

    await setDependents(page, applicant, productTypeSelection, coveredMembers, membersInHouse, householdIncome);

    const results = await scrapePlanListingPage(page);

    await browser.close();
})();

async function getPlanType(page){
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

    return options;
}

async function getProductTypes(page){
    await page.waitForSelector('iframe');
    const iframeHandle = await page.$('iframe');
    const iframe = await iframeHandle.contentFrame();

    let productTypeOptions = await iframe.evaluate(() => {
        const result = {};

        const h2Elements = Array.from(document.querySelectorAll('h2'));

        for (const h2Element of h2Elements) {
            if (h2Element.textContent.trim().includes('Product Type')) {
                const parentElement = h2Element.parentElement;

                const labelElements = Array.from(parentElement.querySelectorAll('label:not([style])'))
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
    return productTypeOptions;
}
async function getCountyAndStates(page, zipCode){
    let cookie = '';
    (await page.cookies()).forEach((c) => {
        cookie += `${c.name}=${c.value};`;
    });

    const response = await fetch(`https://www.quotit.net/eproIFP/state.asp?zipCode=${zipCode}&countyID=-1`, {
        "headers": {
            "accept": "*/*",
            "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
            "sec-ch-ua": "\"Google Chrome\";v=\"119\", \"Chromium\";v=\"119\", \"Not?A_Brand\";v=\"24\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"macOS\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-requested-with": "XMLHttpRequest",
            "cookie": cookie,
            "Referer": "https://www.quotit.net/eproIFP/webPages/infoEntry/InfoEntryZip.asp?license_no=5B3WWR",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": null,
        "method": "GET"
    });

    const responseText = await response.text();
    const state = responseText.split('value=')[1].split('>')[0];

    const countyResponse = await fetch(`https://www.quotit.net/eproIFP/county.asp?zipCode=${zipCode}&countyID=-1&bInfoEntry=true`, {
        "headers": {
            "cookie": cookie,
        },
        "body": null,
        "method": "GET"
    });

    const countyResponseText = await countyResponse.text();
    let countyOptions = countyResponseText.split('\r\n').filter(l => l.startsWith('<option'));
    countyOptions = countyOptions.map(opt => {
        const value = opt.split('>')[0].split('value="')[1].split('"')[0];
        const name = opt.split('>')[1].split('<')[0];
        return {
            value, name
        }
    })
    console.log(countyOptions);
    return {state, countyOptions};
}

async function setDependents(page, applicant, productTypeSelection, coveredMembers, membersInHouse, householdIncome){
    await page.waitForSelector('iframe');

    const iframeHandle = await page.$('iframe');

    const iframe = await iframeHandle.contentFrame();

    await iframe.click(`input[type="radio"][value="${productTypeSelection.value}"]`);

    let dependentRows = 3;

    while(dependentRows < coveredMembers.length){
        await iframe.click('[id="btn_add_a_dependents"]');
        dependentRows++;
    }

    await iframe.evaluate((coveredMembers) => {
        const table = document.querySelector('#tb_Census_Information');
        const trs = Array.from(table.querySelectorAll('tr.table-01-color'));

        console.log('length: ',trs.length);
        // Loop through each row and fill in the data
        for (const [index, data] of coveredMembers.entries()) {
            const row = trs[index];
            // Skip the header row

            console.log(index);

            if (row) {
                const firstNameInput = row.querySelector(`input[class="input-firstName"]`);
                firstNameInput.value = data.firstName;

                const genderSelect = row.querySelector('select');
                genderSelect.value = data.gender;

                const dobInput = row.querySelector(`input[id="txtDoB-${index}"]`);
                dobInput.value = data.dob;

                const zipCodeInput = row.querySelector(`input[id="txtCensusZipCode-${index}"]`);
                zipCodeInput.value = data.zipCode;

                if(data.county){
                    const countySelect = row.querySelector(`select[name="ApplicantCountySelect"]`);
                    countySelect.value = data.county.value;
                }

                if(data.tobaccoDate){
                    const zipCodeInput = row.querySelector(`input[name="txtTime"]`);
                    zipCodeInput.value = data.tobaccoDate;
                }
            }
        }
    }, coveredMembers);

    await iframe.evaluate((membersInHouse) => {
        const householdNumberSelect = document.querySelector('select[id="SelhouseholdSize"]');
        householdNumberSelect.value = membersInHouse;
    }, membersInHouse);

    await iframe.evaluate((householdIncome) => {
        const householdIncomeInput = document.querySelector('input[id="txtIncome"]');
        householdIncomeInput.value = householdIncome;
    }, householdIncome);

    const buttonSelector = 'a.btn.float-right';
    await iframe.waitForSelector(buttonSelector);
    await iframe.click(buttonSelector);

    await page.waitForNavigation();
}
async function scrapePlanListingPage(page){
    try {
        const results = await page.evaluate(() => {
            const results = [];
            const plans = document.querySelectorAll(['div[class="plan-item"]']);

            console.log(plans.length);

            for(const plan of plans){

                const planID =  plan.querySelector('[class="p_planID"]')?.textContent.trim();
                const planName =  plan.querySelector('div[class="plan-name"]').textContent.trim();
                const planTierBadge =  plan.querySelector('div[class="plan-tier-badge"]').textContent.trim();
                const planTypeBadge =  plan.querySelector('div[class="plan-type-badge"]').textContent.trim();
                const premium = plan.querySelector('span[class="premium"]').textContent.trim();

                const scrappedPlan = {'Plan ID': planID, 'Plan Name': planName, 'Plan Tier Badge': planTierBadge, 'Plan Type Badge': planTypeBadge, 'Premium': premium};
                const descriptionElements = plan.querySelectorAll('span[class="label Benefit-description"]');
                descriptionElements.forEach(descriptionElement => {
                    const description = descriptionElement?.textContent.trim();
                    const valueElement = descriptionElement.nextElementSibling;
                    const value = valueElement?.textContent.trim();
                    scrappedPlan[description] = value;
                });
                results.push(scrappedPlan);
            }
            return results;
        });
        return results;
    }catch (e){
        console.log(e);
    }
}

async function scrapePlanDetailPage(page){

}
