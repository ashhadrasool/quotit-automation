const puppeteer = require('puppeteer');

async function scrapeQuotit(applicant, coveredMembers, membersInHouse, householdIncome) {
    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();

    await page.goto('https://www.quotit.net/eproIFP/webPages/infoEntry/InfoEntryZip.asp?license_no=M5S66R');

    await page.type('#zipCode', applicant.zipcode);


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

    //search for labels and with values
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
    console.log(productTypeOptions);

    await iframe.click(`input[type="radio"][value="${productTypeOptions[1].value}"]`);

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

                if(data.tobaccoDate){
                    const zipCodeInput = row.querySelector(`input[name="txtTime"]`);
                    zipCodeInput.value = data.tobaccoDate;
                }

                // const relationshipInput = row.querySelector(`input[type="hidden"]`);
                // relationshipInput.value = data.relationship;
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
    coveredMembers = [
        {
            firstName : "Inshal",
            relationship: "Child",
            gender: "M",
            dob: "01/01/2012",
            zipCode: "90048"
        },
        {
            firstName : "Inshal",
            relationship: "Child",
            gender: "M",
            dob: "01/01/2012",
            zipCode: "90048"
        },
        {
            firstName : "Inshal",
            relationship: "Child",
            gender: "M",
            dob: "01/01/2012",
            tobaccoDate: "02/02/2021",
            zipCode: "90048"
        },
        {
            firstName : "Inshal",
            relationship: "Child",
            gender: "M",
            dob: "01/01/2012",
            tobaccoDate: "02/02/2021",
            zipCode: "90048"
        }
    ];

    membersInHouse = 5;
    householdIncome = 60000;

    //range on site is: 1-10
    // await scrapeQuotit(applicant, coveredMembers, membersInHouse, householdIncome);
    await scrapeHTML();
})();

async function scrapeHTML(){
    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();

    await page.goto('https://www.quotit.net/quotit/apps/epro/EproReportSCL01/IndexSCL01?bSubmitted=0&covTypeID=C&report=IFPReport3&infoEntryLayout=4&brokerID=250242&license_no=M5S66R&wordOfTheDay=mesomorph&owner=quotit&planTypeID=%25&zipCode=90048&doPlanFinder=0&selectedPeriodID=1%2f1%2f2024&countyID=11775&h_MemberId=%2c%2c%2c%2c&tcountyID=11775%2c11775%2c11775%2c11775%2c11775&householdSize=5&insuranceTypeIDRadio=5&effectiveStartDateSM=%2c&effectiveEndDate=%2c&hsmpaymentOption=M&effectiveDate=1%2f1%2f2024&txtAct=Dickerson+Insurance+Services&familyID=51812470&insuranceTypeID=5&familyIDHash=254577666');

    try {
        const results = await page.evaluate(() => {
            const results = [];
            const plans = document.querySelectorAll(['[class="plan-item scPlan-item"]']);

            console.log(plans.length);

            for(const plan of plans){

                const planName =  plan.querySelector('.scPlan-name').textContent.trim();
                const planRating =  plan.querySelector('div[class="row bottom-top-bordered plan-network"]').textContent.trim();
                const premium = plan.querySelector('span[class="premium ahs-accent-coral"]').textContent.trim();

                const scrappedPlan = {'Plan Name': planName, 'Plan Rating': planRating, 'Premium': premium};

                const descriptionElements = document.querySelectorAll('.label.Benefit-description');
                descriptionElements.forEach(descriptionElement => {
                    const description = descriptionElement.textContent.trim();
                    const valueElement = descriptionElement.nextElementSibling;
                    const value = valueElement.textContent.trim();
                    scrappedPlan[description] = value;
                    // pairs.push({ key: description, value });
                });

                results.push(scrappedPlan);
            }
            return results;
        });
        console.log(results);
    }catch (e){
        console.log(e);
    }

    await browser.close();
}
