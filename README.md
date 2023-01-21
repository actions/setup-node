# setup-node

<p align="left">
  <a href="https://github.com/actions/setup-node/actions?query=workflow%3Abuild-test"><img alt="build-test status" src="https://github.com/actions/setup-node/workflows/build-test/badge.svg"></a> <a href="https://github.com/actions/setup-node/actions?query=workflow%3Aversions"><img alt="versions status" src="https://github.com/actions/setup-node/workflows/versions/badge.svg"></a> <a href="https://github.com/actions/setup-node/actions?query=workflow%3Aproxy"><img alt="proxy status" src="https://github.com/actions/setup-node/workflows/proxy/badge.svg"></a> 
</p>

This action sets by node environment for use in actions by:

- optionally downloading and caching a version of node - npm by version spec and add to PATH
- registering problem matchers for error output
- configuring authentication for GPR or npm

# v2-beta

A beta release which adds reliability for pulling node distributions from a cache of node releases is available by referencing the `v2-beta` tag.

```yaml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-node@v2-beta
  with:
    node-version: '12'
```

The action will first check the local cache for a semver match. The hosted images have been updated with the latest of each LTS from v8, v10, v12, and v14. `self-hosted` machines will benefit from the cache as well only downloading once. The action will pull LTS versions from [node-versions releases](https://github.com/actions/node-versions/releases) and on miss or failure will fall back to the previous behavior of downloading directly from [node dist](https://nodejs.org/dist/).

The `node-version` input is optional. If not supplied, the node version that is PATH will be used. However, this action will still register problem matchers and support auth features. So setting up the node environment is still a valid scenario without downloading and caching versions.

# Usage

See [action.yml](action.yml)

Basic:
```yaml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-node@v1
  with:
    node-version: '12'
- run: npm install
- run: npm test
```

Check latest version:

In the basic example above, the `check-latest` flag defaults to `false`. When set to `false`, the action tries to first resolve a version of node from the local cache. For information regarding locally cached versions of Node on GitHub hosted runners, check out [GitHub Actions Virtual Environments](https://github.com/actions/virtual-environments). The local version of Node in cache gets updated every couple of weeks. If unable to find a specific version in the cache, the action will then attempt to download a version of Node. Use the default or set `check-latest` to `false` if you prefer stability and if you want to ensure a specific version of Node is always used.

If `check-latest` is set to `true`, the action first checks if the cached version is the latest one. If the locally cached version is not the most up-to-date, a version of Node will then be downloaded. Set `check-latest` to `true` it you want the most up-to-date version of Node to always be used.

> Setting `check-latest` to `true` has performance implications as downloading versions of Node is slower than using cached versions

```yaml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-node@v2
  with:
    node-version: '12'
    check-latest: true
- run: npm install
- run: npm test
```

Matrix Testing:
```yaml
jobs:
  build:
    runs-on: ubuntu-16.04
    strategy:
      matrix:
        node: [ '10', '12' ]
    name: Node ${{ matrix.node }} sample
    steps:
      - uses: actions/checkout@v2
      - name: Setup node
        uses: actions/setup-node@v1
        with:
          node-version: ${{ matrix.node }}
      - run: npm install
      - run: npm test
```

Publish to npmjs and GPR with npm:
```yaml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-node@v1
  with:
    node-version: '10.x'
    registry-url: 'https://registry.npmjs.org'
- run: npm install
- run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
- uses: actions/setup-node@v1
  with:
    registry-url: 'https://npm.pkg.github.com'
- run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Publish to npmjs and GPR with yarn:
```yaml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-node@v1
  with:
    node-version: '10.x'
    registry-url: <registry url>
- run: yarn install
- run: yarn publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.YARN_TOKEN }}
- uses: actions/setup-node@v1
  with:
    registry-url: 'https://npm.pkg.github.com'
- run: yarn publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Use private packages:
```yaml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-node@v1
  with:
    node-version: '10.x'
    registry-url: 'https://registry.npmjs.org'
# Skip post-install scripts here, as a malicious
# script could steal NODE_AUTH_TOKEN.
- run: npm install --ignore-scripts
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
# `npm rebuild` will run all those post-install scripts for us.
- run: npm rebuild && npm run prepare --if-present
```


# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

# Contributions

Contributions are welcome!  See [Contributor's Guide](docs/contributors.md)

## Code of Conduct

:ZW/zwave: Be nice.  See [our code of conduct](CONDUCT)

Skip to content
Search or jump to…
Pull requests
Issues
Codespaces
Marketplace
Explore
 
@zakwarlord7 
Your account has been flagged.
Because of that, your profile is hidden from the public. If you believe this is a mistake, contact support to have your account status reviewed.
zakwarlord7
/
ci-C-UsersI-ID-3628c5e1-4e65-42de-8a8c-ea2208ae37ec-ID-3628c5e1-4e65-42de-8a8c-ea2208ae37ec-.br
Private
Cannot fork because you own this repository and are not a member of any organizations.
Code
Issues
Pull requests
1
Actions
Projects
Security
Insights
Settings
ci-C-UsersI-ID-3628c5e1-4e65-42de-8a8c-ea2208ae37ec-ID-3628c5e1-4e65-42de-8a8c-ea2208ae37ec-.br/.github/workflows/laravel.yml
@zakwarlord7
zakwarlord7 Create laravel.yml
Latest commit 20d65c2 3 days ago
 History
 1 contributor
975 lines (619 sloc)  131 KB

name: Laravel

on:
  push:
    branches: [ "paradice" ]
  pull_request:
    branches: [ "paradice" ]

jobs:
  laravel-tests:

    runs-on: ubuntu-latest

    steps:
    - uses: shivammathur/setup-php@15c43e89cdef867065b0213be354c2841860869e
      with:
        php-version: '8.0'
    - uses: actions/checkout@v3
    - name: Copy .env
      run: php -r "file_exists('.env') || copy('.env.example', '.env');"
    - name: Install Dependencies
      run: composer install -q --no-ansi --no-interaction --no-scripts --no-progress --prefer-dist
    - name: Generate key
      run: php artisan key:generate
    - name: Directory Permissions
      run: chmod -R 777 storage bootstrap/cache
    - name: Create Database
      run: |
        mkdir -p database
        touch database/database.sqlite
    - name: Execute tests (Unit and Feature tests) via PHPUnit
      env:
        DB_CONNECTION: sqlite
        DB_DATABASE: database/database.sqlite
      run: vendor/bin/phpunit
# This workflow will triage pull requests and apply a label based on the
# paths that are modified in the pull request.
#
# To use this workflow, you will need to set up a .github/labeler.yml
# file with configuration.  For more information, see:
# https://github.com/actions/labeler

name: Labeler
on: [pull_request]

jobs:
  label:

    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
    - uses: actions/labeler@v4
      with:
        repo-token: "${{ secrets.GITHUB_TOKEN }}"
# Sample workflow for building and deploying an Astro site to GitHub Pages
#
# To get started with Astro see: https://docs.astro.build/en/getting-started/
#
name: Deploy Astro site to Pages

on:
  # Runs on pushes targeting the default branch
  push:
    branches: ["paradice"]

  # Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:

# Sets permissions of the GITHUB_TOKEN to allow deployment to GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# Allow one concurrent deployment
concurrency:
  group: "pages"
  cancel-in-progress: true

env:
  BUILD_PATH: "." # default value when not using subfolders
  # BUILD_PATH: subfolder
# This workflow uses actions that are not certified by GitHub.
# They are provided by a third-party and are governed by
# separate terms of service, privacy policy, and support
# documentation.

# Sample workflow for building and deploying a Jekyll site to GitHub Pages
name: Deploy Jekyll site to Pages

on:
  # Runs on pushes targeting the default branch
  push:
    branches: ["paradice"]

  # Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:

# Sets permissions of the GITHUB_TOKEN to allow deployment to GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# Allow one concurrent deployment
concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  # Build job
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Setup Ruby
        uses: ruby/setup-ruby@ee2113536afb7f793eed4ce60e8d3b26db912da4 # v1.127.0
        with:
          ruby-version: '3.0' # Not needed with a .ruby-version file
          bundler-cache: true # runs 'bundle install' and caches installed gems automatically
          cache-version: 0 # Increment this number if you need to re-download cached gems
      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v2
      - name: Build with Jekyll
        # Outputs to the './_site' directory by default
        run: bundle exec jekyll build --baseurl "${{ steps.pages.outputs.base_path }}"
        env:
          JEKYLL_ENV: production
      - name: Upload artifact
        # Automatically uploads an artifact from the './_site' directory by default
        uses: actions/upload-pages-artifact@v1

  # Deployment job
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v1

jobs:
  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Detect package manager
        id: detect-package-manager
        run: |
          if [ -f "${{ github.workspace }}/yarn.lock" ]; then
            echo "manager=yarn" >> $GITHUB_OUTPUT
            echo "command=install" >> $GITHUB_OUTPUT
            echo "runner=yarn" >> $GITHUB_OUTPUT
            exit 0
          elif [ -f "${{ github.workspace }}/package.json" ]; then
            echo "manager=npm" >> $GITHUB_OUTPUT
            echo "command=ci" >> $GITHUB_OUTPUT
            echo "runner=npx --no-install" >> $GITHUB_OUTPUT
            exit 0
          else
            echo "Unable to determine packager manager"
            exit 1
          fi
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: "16"
          cache: ${{ steps.detect-package-manager.outputs.manager }}
          cache-dependency-path: ${{ env.BUILD_PATH }}/package-lock.json
      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v2
      - name: Install dependencies
        run: ${{ steps.detect-package-manager.outputs.manager }} ${{ steps.detect-package-manager.outputs.command }}
        working-directory: ${{ env.BUILD_PATH }}
      - name: Build with Astro
        run: |
          ${{ steps.detect-package-manager.outputs.runner }} astro build \
            --site "${{ steps.pages.outputs.origin }}" \
            --base "${{ steps.pages.outputs.base_path }}"
        working-directory: ${{ env.BUILD_PATH }}
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v1
        with:
          path: ${{ env.BUILD_PATH }}/dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    needs: build
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v1
        
      ' This Product Contains Sensitive Taxpayer Data Form 1040-V 2021 n Page 2 IF you live in . . . THEN use this address to send in your payment . . . Alabama, Florida, Georgia, Louisiana, Mississippi, North Internal Revenue Service Carolina, South Carolina, Tennessee, Texas P..O. Box 1214 Charlotte, NC 28201-1214 Arkansas, Connecticut, Delaware, District of Columbia, Illinois, Internal Revenue Service Indiana, Iowa, Kentucky, Maine, Maryland, Massachusetts, P.O. Box 931000 Minnesota, Missouri, New Hampshire, New Jersey, New York, Louisville, KY 40293-1000 Oklahoma, Rhode Island, Vermont, Virginia, West Virgfinia, Wisconsin Alaska, Arizona, California, Colorado, Hawaii, Idaho, Kansas, Internal Revenue Service Michigan, Montana, Nebraska, Nevada, New Mexico, North P.O. Box 802501 Dakota, Ohio, Oregon, Pennsylvania, South Dakota, Utah, Cincinnati, OH 45280-2501 Washington, Wyoming A foreign country, American Samoa, or Puerto Rico (or are Internal Revenue Service excluding income under Internal Revenue Code 933), or use an APO P.O. Box 1303 or FPO address, or file Form 2555 or 4563, or are a dual-status alein Charlotte, NC 28201-1303 or nonpermanent resident of Guam or the U.S. Virgin Islands TO PAY YOUR TAXES DUE BY CHECK, MAIIL THIS FORM TO THE ADDRESS LISTED BELOW. Form 1040-V 2021 Detatch Here and Mail With Your Payment and Return ** THIS PAGE SHOULD BE FILLED OUT BY YOUR BANKER OR BESIDE YOUR BANKER ** Company Name: UNITED STATES Relationship Manager: VANESSA COUNTRYMAN Treasury Management Officer: ZACHRY TYLER WOOD Please link your flow of funds: BELOW FOR BANK TEAM TO FILL OUT: What kind of account(s) does [Company Name] have? To ensure the customer has the right account(s) enabled in order to implement with Modern Treasury Corporate is the ONLY account type capable of working with Modern Treasury. What type of account(s) does the customer have with JPMC? Commercial Not Commercial? Will need the customer's account moved to Commercial. Product Enablement for Modern Treasury Connectivity : Let’s make sure the account(s) is/are ready to implement with Modern Treasury. ACCESS must be enabled in order to integrate with Modern Treasury. Does the customer have the correct product enabled for their account(s)?: Yes/No (Please Circle) Yes No - [Please enable ACCESS for the necessary account(s).] - 47-2041-6547 What payment rails are enabled for [Company Name] accounts? Let’s ensure the customer has the correct payment rails enabled for their business flow of funds. [Example] Account Number : (check off what is needed only) ACH USD Wires Non-USD Wires Lockbox Check-Print Reporting [Enablement required for all accounts] Account Reconciliation : Previous/Intra-day BAI2 Balance Files Incoming ACH EMPLOYMENT VERIFICATION LETTER INSTRUCTIONS ADP Logo Department of the Treasury Internal Revenue Service (99) 2021 Form 1040-V Payment Voucher > Use this voucher when making a payment with Form 1040. > Do not staple this voucher or your payment to Form 1040. > Make your check or money order payable to the 'United States Treasury.' Enter the amount > Write your social security number (SSN) on your check or money order. of your payment |. . . . . . . . > | 7567263607 . | REV 04/109/2022 INTUIT.CG. 1555 ZACHRY T WOOD INTERNAL REVENUE SERVICE 5222 BRADFORD DR P.O. BOX 1214 DALLAS TX 75235-8313 CHARLOTTE NC 28201-1214 633441725 BH WOOD 30 0 202112 610 ACCOUNT BALANCE PLUS ACCRUALS (this is not a payoff amount): 0.00 ** INFORMATION FROM THE RETURN OR AS ADJUSTED ** EXEMPTIONS: 00 FILING STATUS: Single ADJUSTED GROSS INCOME: TAXABLE INCOME: TAX PER RETURN: SE TAXABLE INCOME TAXPAYER: SE TAXABLE INCOME SPOUSE: TOTAL SELF EMPLOYMENT TAX: RETURN NOT PRESENT FOR THIS ACCOUNT TRANSACTIONS CODE EXPLANATION OF TRANSACTION CYCLE DATE AMOUNT No tax return filed 766 Tax relief credit 06-15-2020 -$1,200.00 846 Refund issued 06-05-2020 $1,200.00 290 Additional tax assessed 20202205 06-15-2020 $0.00 76254-999-05099-0 971 Notice issued 06-15-2020 $0.00 766 Tax relief credit 01-18-2021 -$600.00 846 Refund issued 01-06-2021 $600.00 290 Additional tax assessed 20205302 01-18-2021 $0.00 76254-999-05055-0 663 Estimated tax payment 01-05-2021 -$9,000,000.00 662 Removed estimated tax payment 01-05-2021 $9,000,000.00 740 Undelivered refund returned to IRS 01-18-2021 -$600.00 767 Reduced or removed tax relief 01-18-2021 $600.00 credit 971 Notice issued 03-28-2022 $0.00 Form 1040 (2021) Page 2 Department of the Treasury --- Internal Revenue Service (99) | 2021 | OMB No. 1545-0074 | IRS Use Only--Do not write or staple in this space. U.S. Individual Income Tax Return Returned for Signature IRS RECIEVED 37 26-Apr. Date_____________09-01-2022 LB Charlotte, NC **THIS PAGE SHOULD BE FILLED OUT BY YOUR BANKER OR BESIDE YOUR BANKER Company Name: UNITED STATES Relationship Manager: VANESSA COUNTRYMAN Treasury Management Officer: ZACHRY TYLER WOO_
￼ZACHRY WOOD <zachryiixixiiwood@gmail.com>
(no subject
ZACHRY WOOD <zachryiixixiiwood@gmail.com>Tue, Jan 17, 2023 at 8:14 AM
To: "ZACHRY “Google.” WOOD" <zachryiixixiiwood@gmail.com>, PNC Alerts <pncalerts@pnc.com>
Mon, Nov 21 at 2:51 PM
Revenues        12 Months Ended                                                                                                                                                        
        Dec. 31, 2020                                                                                                                                                        
Revenue from Contract with Customer []                                                                                                                                                                
Revenues        Revenues Revenue Recognition The following table presents our revenues disaggregated by type (in millions). Year Ended December 31, 2018 2019 2020 Google Search & other $ 85,296 $ 98,115 $ 104,062 YouTube ads 11,155 15,149 19,772 Google Network Members' properties 20,010 21,547 23,090 Google advertising 116,461 134,811 146,924 Google other 14,063 17,014 21,711 Google Services total 130,524 151,825 168,635 Google Cloud 5,838 8,918 13,059 Other Bets 595 659 657 Hedging gains (losses) (138) 455 176 Total revenues $ 136,819 $ 161,857 $ 182,527 The following table presents our revenues disaggregated by geography, based on the addresses of our customers (in millions): Year Ended December 31, 2018 2019 2020 United States $ 63,269 46 % $ 74,843 46 % $ 85,014 47 % EMEA (1) 44,739 33 50,645 31 55,370 30 APAC (1) 21,341 15 26,928 17 32,550 18 Other Americas (1) 7,608 6 8,986 6 9,417 5 Hedging gains (losses) (138) 0 455 0 176 0 Total revenues $ 136,819 100 % $ 161,857 100 % $ 182,527 100 % (1) Regions represent Europe, the Middle East, and Africa ("EMEA"); Asia-Pacific ("APAC"); and Canada and Latin America ("Other Americas"). Deferred Revenues and Remaining Performance Obligations We record deferred revenues when cash payments are received or due in advance of our performance, including amounts which are refundable. Deferred revenues primarily relate to Google Cloud and Google other. Our total deferred revenue as of December 31, 2019 was $2.3 billion, of which $1.8 billion was recognized as revenues for the year ending December 31, 2020. Additionally, we have performance obligations associated with commitments in customer contracts, primarily related to Google Cloud, for future services that have not yet been recognized as revenues, also referred to as remaining performance obligations. Remaining performance obligations include related deferred revenue currently recorded as well as amounts that will be invoiced in future periods, and excludes (i) contracts with an original expected term of one year or less, (ii) cancellable contracts, and (iii) contracts for which we recognize revenue at the amount to which we have the right to invoice for services performed. As of December 31, 2020, the amount not yet recognized as revenues from these commitments is $29.8 billion. We expect to recognize approximately half over the next CONSOLIDATED BALANCE SHEETS (Parenthetical) - $ / shares        Dec. 31, 2020        Dec. 31, 2019        

Stockholders’ equity:                        

Convertible preferred stock, par value per share (in dollars per share)         $ 0.001          $ 0.001         

Convertible preferred stock, shares authorized (in shares)         100,000,000          100,000,000         

Convertible preferred stock, shares issued (in shares)         0          0         

Convertible preferred stock, shares outstanding (in shares)         0          0         

Common stock and capital stock, par value (in dollars per share)         $ 0.001          $ 0.001         

Common stock and capital stock, shares authorized (in shares)         15,000,000,000          15,000,000,000         

Common stock and capital stock, shares issued (in shares)         675,222,000          688,335,000         

Common stock and capital stock, shares outstanding (in shares)         675,222,000          688,335,000         

Class A Common Stock                        

Stockholders’ equity:                        

Common stock and capital stock, shares authorized (in shares)         9,000,000,000          9,000,000,000         

Common stock and capital stock, shares issued (in shares)         300,730,000          299,828,000         

Common stock and capital stock, shares outstanding (in shares)         300,730,000          299,828,000         

Class B Common Stock                        

Stockholders’ equity:                        

Common stock and capital stock, shares authorized (in shares)         3,000,000,000          3,000,000,000         

Common stock and capital stock, shares issued (in shares)         45,843,000          46,441,000         

Common stock and capital stock, shares outstanding (in shares)         45,843,000          46,441,000         

Class C Capital Stock                        

Stockholders’ equity:                        

Common stock and capital stock, shares authorized (in shares)         3,000,000,000          3,000,000,000         

Common stock and capital stock, shares issued (in shares)         328,649,000          342,066,000         

Common stock and capital stock, shares outstanding (in shares)         328,649,000          342,066,000

DEPOSIT TICKET

Deposited to the account Of xxxxxxxx6547

Deposits and Other Additions                                                                                           Checks and Other Deductions Amount

Description Description I Items 5.41

ACH Additions Debit Card Purchases 1 15.19

POS Purchases 2 2,269,894.11

ACH Deductions 5 82

Service Charges and Fees 3 5.2

Other Deductions 1 2,270,001.91

Total Total 12



Daily Balance


Date Ledger balance Date Ledger balance Date Ledger balance

7/30 107.8 8/3 2,267,621.92- 8/8 41.2

8/1 78.08 8/4 42.08 8/10 2150.19-






Daily Balance continued on next page

Date

8/3 2,267,700.00 ACH Web Usataxpymt IRS 240461564036618 (0.00022214903782823)

8/8 Corporate ACH Acctverify Roll By ADP (00022217906234115)

8/10 ACH Web Businessform Deluxeforbusiness 5072270 (00022222905832355)

8/11 Corporate Ach Veryifyqbw Intuit (00022222909296656)

8/12 Corporate Ach Veryifyqbw Intuit (00022223912710109)



Service Charges and Fees

Reference

Date posted number

8/1 10 Service Charge Period Ending 07/29.2022

8/4 36 Returned ItemFee (nsf) (00022214903782823)

8/11 36 Returned ItemFee (nsf) (00022222905832355)








INCOME STATEMENT


INASDAQ:GOOG TTM Q4 2021 Q3 2021 Q2 2021 Q1 2021 Q4 2020 Q3 2020 Q2 2020


Gross Profit 1.46698E+11 42337000000 37497000000 35653000000 31211000000 30818000000 25056000000 19744000000

Total Revenue as Reported, Supplemental 2.57637E+11 75325000000 65118000000 61880000000 55314000000 56898000000 46173000000 38297000000

2.57637E+11 75325000000 65118000000 61880000000 55314000000 56898000000 46173000000 38297000000

Other Revenue

Cost of Revenue -1.10939E+11 -32988000000 -27621000000 -26227000000 -24103000000 -26080000000 -21117000000 -18553000000

Cost of Goods and Services -1.10939E+11 -32988000000 -27621000000 -26227000000 -24103000000 -26080000000 -21117000000 -18553000000

Operating Income/Expenses -67984000000 -20452000000 -16466000000 -16292000000 -14774000000 -15167000000 -13843000000 -13361000000

Selling, General and Administrative Expenses -36422000000 -11744000000 -8772000000 -8617000000 -7289000000 -8145000000 -6987000000 -6486000000

General and Administrative Expenses -13510000000 -4140000000 -3256000000 -3341000000 -2773000000 -2831000000 -2756000000 -2585000000

Selling and Marketing Expenses -22912000000 -7604000000 -5516000000 -5276000000 -4516000000 -5314000000 -4231000000 -3901000000

Research and Development Expenses -31562000000 -8708000000 -7694000000 -7675000000 -7485000000 -7022000000 -6856000000 -6875000000

Total Operating Profit/Loss 78714000000 21885000000 21031000000 19361000000 16437000000 15651000000 11213000000 6383000000

Non-Operating Income/Expenses, Total 12020000000 2517000000 2033000000 2624000000 4846000000 3038000000 2146000000 1894000000

Total Net Finance Income/Expense 1153000000 261000000 310000000 313000000 269000000 333000000 412000000 420000000

Net Interest Income/Expense 1153000000 261000000 310000000 313000000 269000000 333000000 412000000 420000000


Interest Expense Net of Capitalized Interest -346000000 -117000000 -77000000 -76000000 -76000000 -53000000 -48000000 -13000000

Interest Income 1499000000 378000000 387000000 389000000 345000000 386000000 460000000 433000000

Net Investment Income 12364000000 2364000000 2207000000 2924000000 4869000000 3530000000 1957000000 1696000000

Gain/Loss on Investments and Other Financial Instruments 12270000000 2478000000 2158000000 2883000000 4751000000 3262000000 2015000000 1842000000

Income from Associates, Joint Ventures and Other Participating Interests 334000000 49000000 188000000 92000000 5000000 355000000 26000000 -54000000

Gain/Loss on Foreign Exchange -240000000 -163000000 -139000000 -51000000 113000000 -87000000 -84000000 -92000000

Irregular Income/Expenses 0 0 0 0 0

Other Irregular Income/Expenses 0 0 0 0 0

Other Income/Expense, Non-Operating -1497000000 -108000000 -484000000 -613000000 -292000000 -825000000 -223000000 -222000000

Pretax Income 90734000000 24402000000 23064000000 21985000000 21283000000 18689000000 13359000000 8277000000

Provision for Income Tax -14701000000 -3760000000 -4128000000 -3460000000 -3353000000 -3462000000 -2112000000 -1318000000

Net Income from Continuing Operations 76033000000 20642000000 18936000000 18525000000 17930000000 15227000000 11247000000 6959000000

Net Income after Extraordinary Items and Discontinued Operations 76033000000 20642000000 18936000000 18525000000 17930000000 15227000000 11247000000 6959000000

Net Income after Non-Controlling/Minority Interests 76033000000 20642000000 18936000000 18525000000 17930000000 15227000000 11247000000 6959000000

Net Income Available to Common Stockholders 76033000000 20642000000 18936000000 18525000000 17930000000 15227000000 11247000000 6959000000

Diluted Net Income Available to Common Stockholders 76033000000 20642000000 18936000000 18525000000 17930000000 15227000000 11247000000 6959000000

Income Statement Supplemental Section

Reported Normalized and Operating Income/Expense Supplemental Section

Total Revenue as Reported, Supplemental 2.57637E+11 75325000000 65118000000 61880000000 55314000000 56898000000 46173000000 38297000000

Total Operating Profit/Loss as Reported, Supplemental 78714000000 21885000000 21031000000 19361000000 16437000000 15651000000 11213000000 6383000000

Reported Effective Tax Rate 0.162 0.179 0.157 0.158 0.158 0.159

Reported Normalized Income

Reported Normalized Operating Profit

Other Adjustments to Net Income Available to Common Stockholders

Discontinued Operations

Basic EPS 113.88 31.15 28.44 27.69 26.63 22.54 16.55 10.21

Basic EPS from Continuing Operations 113.88 31.12 28.44 27.69 26.63 22.46 16.55 10.21

Basic EPS from Discontinued Operations

Diluted EPS 112.2 30.69 27.99 27.26 26.29 22.3 16.4 10.13

Diluted EPS from Continuing Operations 112.2 30.67 27.99 27.26 26.29 22.23 16.4 10.13

Diluted EPS from Discontinued Operations

Basic Weighted Average Shares Outstanding 667650000 662664000 665758000 668958000 673220000 675581000 679449000 681768000

Diluted Weighted Average Shares Outstanding 677674000 672493000 676519000 679612000 682071000 682969000 685851000 687024000

Reported Normalized Diluted EPS

Basic EPS 113.88 31.15 28.44 27.69 26.63 22.54 16.55 10.21

Diluted EPS 112.2 30.69 27.99 27.26 26.29 22.3 16.4 10.13

Basic WASO 667650000 662664000 665758000 668958000 673220000 675581000 679449000 681768000

Diluted WASO 677674000 672493000 676519000 679612000 682071000 682969000 685851000 687024000

Fiscal year end September 28th., 2022. | USD

Your federal taxable wages this period are $

ALPHABET INCOME Advice number:

1600 AMPIHTHEATRE  PARKWAY MOUNTAIN VIEW CA 94043 2.21169E+13





GOOGL_income-statement_Quarterly_As_Originally_Reported Q4 2021 Q3 2021 Q2 2021 Q1 2021 Q4 2020

Cash Flow from Operating Activities, Indirect 24934000000 25539000000 37497000000 31211000000 30818000000

Net Cash Flow from Continuing Operating Activities, Indirect 24934000000 25539000000 21890000000 19289000000 22677000000

Cash Generated from Operating Activities 24934000000 25539000000 21890000000 19289000000 22677000000

Income/Loss before Non-Cash Adjustment 20642000000 18936000000 18525000000 17930000000 15227000000

Total Adjustments for Non-Cash Items 6517000000 3797000000 4236000000 2592000000 5748000000

Depreciation, Amortization and Depletion, Non-Cash Adjustment 3439000000 3304000000 2945000000 2753000000 3725000000

Depreciation and Amortization, Non-Cash Adjustment 3439000000 3304000000 2945000000 2753000000 3725000000

Depreciation, Non-Cash Adjustment 3215000000 3085000000 2730000000 2525000000 3539000000

Amortization, Non-Cash Adjustment 224000000 219000000 215000000 228000000 186000000

Stock-Based Compensation, Non-Cash Adjustment 3954000000 3874000000 3803000000 3745000000 3223000000

Taxes, Non-Cash Adjustment 1616000000 -1287000000 379000000 1100000000 1670000000

Investment Income/Loss, Non-Cash Adjustment -2478000000 -2158000000 -2883000000 -4751000000 -3262000000

Gain/Loss on Financial Instruments, Non-Cash Adjustment -2478000000 -2158000000 -2883000000 -4751000000 -3262000000

Other Non-Cash Items -14000000 64000000 -8000000 -255000000 392000000

Changes in Operating Capital -2225000000 2806000000 -871000000 -1233000000 1702000000

Change in Trade and Other Receivables -5819000000 -2409000000 -3661000000 2794000000 -5445000000

Change in Trade/Accounts Receivable -5819000000 -2409000000 -3661000000 2794000000 -5445000000

Change in Other Current Assets -399000000 -1255000000 -199000000 7000000 -738000000

Change in Payables and Accrued Expenses 6994000000 3157000000 4074000000 -4956000000 6938000000

Change in Trade and Other Payables 1157000000 238000000 -130000000 -982000000 963000000

Change in Trade/Accounts Payable 1157000000 238000000 -130000000 -982000000 963000000

Change in Accrued Expenses 5837000000 2919000000 4204000000 -3974000000 5975000000

Change in Deferred Assets/Liabilities 368000000 272000000 -3000000 137000000 207000000

Change in Other Operating Capital -3369000000 3041000000 -1082000000 785000000 740000000

Change in Prepayments and Deposits

Cash Flow from Investing Activities -11016000000 -10050000000 -9074000000 -5383000000 -7281000000

Cash Flow from Continuing Investing Activities -11016000000 -10050000000 -9074000000 -5383000000 -7281000000

Purchase/Sale and Disposal of Property, Plant and Equipment, Net -6383000000 -6819000000 -5496000000 -5942000000 -5479000000

Purchase of Property, Plant and Equipment -6383000000 -6819000000 -5496000000 -5942000000 -5479000000

Sale and Disposal of Property, Plant and Equipment

Purchase/Sale of Business, Net -385000000 -259000000 -308000000 -1666000000 -370000000

Purchase/Acquisition of Business -385000000 -259000000 -308000000 -1666000000 -370000000

Purchase/Sale of Investments, Net -4348000000 -3360000000 -3293000000 2195000000 -1375000000

Purchase of Investments -40860000000 -35153000000 -24949000000 -37072000000 -36955000000

Sale of Investments 36512000000 31793000000 21656000000 39267000000 35580000000

Other Investing Cash Flow 100000000 388000000 23000000 30000000 -57000000

Purchase/Sale of Other Non-Current Assets, Net

Sales of Other Non-Current Assets

Cash Flow from Financing Activities -16511000000 -15254000000 -15991000000 -13606000000 -9270000000

Cash Flow from Continuing Financing Activities -16511000000 -15254000000 -15991000000 -13606000000 -9270000000

Issuance of/Payments for Common Stock, Net -13473000000 -12610000000 -12796000000 -11395000000 -7904000000

Payments for Common Stock 13473000000 -12610000000 -12796000000 -11395000000 -7904000000

Proceeds from Issuance of Common Stock

Issuance of/Repayments for Debt, Net 115000000 -42000000 -1042000000 -37000000 -57000000

Issuance of/Repayments for Long Term Debt, Net 115000000 -42000000 -1042000000 -37000000 -57000000

Proceeds from Issuance of Long Term Debt 6250000000 6350000000 6699000000 900000000 0

Repayments for Long Term Debt 6365000000 -6392000000 -7741000000 -937000000 -57000000

Proceeds from Issuance/Exercising of Stock Options/Warrants 2923000000 -2602000000 -2453000000 -2184000000 -1647000000



Other Financing Cash Flow 0

Cash and Cash Equivalents, End of Period 20945000000 23719000000 300000000 10000000 338000000000)

Change in Cash 25930000000 235000000000) 23630000000 26622000000 26465000000

Effect of Exchange Rate Changes 181000000000) -146000000000) -3175000000 300000000 6126000000

Cash and Cash Equivalents, Beginning of Period 2.3719E+13 2.363E+13 183000000 -143000000 210000000

Cash Flow Supplemental Section 2774000000) 89000000 266220000000000) 26465000000000) 20129000000000)

Change in Cash as Reported, Supplemental 13412000000 157000000 -2992000000 6336000000

Income Tax Paid, Supplemental 2774000000 89000000 2.2677E+15 -4990000000

Cash and Cash Equivalents, Beginning of Period


12 Months Ended

_________________________________________________________

Q4 2020 Q4  2019

Income Statement

USD in "000'"s

Repayments for Long Term Debt Dec. 31, 2020 Dec. 31, 2019

Costs and expenses:

Cost of revenues 182527 161857

Research and development

Sales and marketing 84732 71896

General and administrative 27573 26018

European Commission fines 17946 18464

Total costs and expenses 11052 9551

Income from operations 0 1697

Other income (expense), net 141303 127626

Income before income taxes 41224 34231

Provision for income taxes 6858000000 5394

Net income 22677000000 19289000000

*include interest paid, capital obligation, and underweighting 22677000000 19289000000

22677000000 19289000000

Basic net income per share of Class A and B common stock and Class C capital stock (in dollars par share)

Diluted net income per share of Class A and Class B common stock and Class C capital stock (in dollars par share)



For Disclosure, Privacy Act, and Paperwork Reduction Act Notice, see the seperate Instructions.


Returned for Signature

Date.                                                               2022-09-01


IRS

7364 Features Detaile on Back. MP } EXECUTOR/ {AUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHO MP }PERSONAL {AUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHO MP } TRUSTEE {AUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHO MP }PERSONAL {AUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHO MP } TRUSTEE {AUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHORIZEDSIGNATUREAUTHO 1 Earnings Statement A ALPHABET Period Beginning: 37151 1600 AMPITHEATRE PARKWAY DR Period Ending: 44833 MOUNTAIN VIEW, C.A., 94043 Pay Date: 44591 "Taxable Marital Status: Net Pay 70842743866 70842743866 CHECKING Net Check 70842743866 Your federal taxable wages this period are $ ALPHABET INCOME Advice number: 650001 1600 AMPIHTHEATRE PARKWAY MOUNTAIN VIEW CA 94043 Pay date:_ 44669 Deposited to the account Of xxxxxxxx6547 transit ABA "PLEASE READ THE IMPORTANT DISCLOSURES BELOW 20210418 Rate Units Total YTD Taxes / Deductions Current YTD - - 70842745000 70842745000 Federal Withholding 0 0 FICA - Social Security 0 8853.6 FICA - Medicare 0 0 Employer Taxes FUTA 0 0 SUTA 0 0 EIN: 61-1767919 ID : 00037305581 SSN: 633441725 Gross 70842745000 Earnings Statement Taxes / Deductions Stub Number: 1 0 Net Pay SSN Pay Schedule Pay Period Sep 28, 2022 to Sep 29, 2023 Pay Date 4/18/2022 70842745000 XXX-XX-1725 Annually DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit card        DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cardDIRECT DEPOSIT FORMDIRECT DEPOSIT FORM 1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payer1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payer1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payer1 Fill out the form below1 Fill out the form below2 Sign the form2 Sign the form3 Hand the form to your employer/payer3 Hand the form to your employer/payer Account InformationAccount Information Cardholder Name:Zachry WoodPhone Number:14699870314Bank Name:DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted text

DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided Check
Routing Number031101169
Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cardCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cardCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cardDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit $ dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted.        DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit $ dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted.DIRECT DEPOSIT FORMDIRECT DEPOSIT FORM 1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payer1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payer1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payer1 Fill out the form below1 Fill out the form below2 Sign the form2 Sign the form3 Hand the form to your employer/payer3 Hand the form to your employer/payer Account InformationAccount Information Cardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Cardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Cardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001AmountAmount Deposit my entire checkDeposit my entire checkDeposit $ dollars of my checkDeposit $ dollars of my checkDeposit % of my checkDeposit % of my checkExample Voided CheckExample Voided Check       Routing Number031101169Routing Number031101169Account Number8846669853001Account Number8846669853001  AuthorizationAuthorization I wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.I wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.     SignatureSignatureDateDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted.Direct deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit $ dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted.        DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit $ dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted.DIRECT DEPOSIT FORMDIRECT DEPOSIT FORM 1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payer1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payer1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payer1 Fill out the form below1 Fill out the form below2 Sign the form2 Sign the form3 Hand the form to your employer/payer3 Hand the form to your employer/payer Account InformationAccount Information Cardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Cardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Cardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001AmountAmount Deposit my entire checkDeposit my entire checkDeposit $ dollars of my checkDeposit $ dollars of my checkDeposit % of my checkDeposit % of my checkExample Voided CheckExample Voided Check       Routing Number031101169Routing Number031101169Account Number8846669853001Account Number8846669853001  AuthorizationAuthorization I wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.I wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.     SignatureSignatureDateDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted.Direct deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit card        DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cardDIRECT DEPOSIT FORMDIRECT DEPOSIT FORM 1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payer1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payer1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payer1 Fill out the form below1 Fill out the form below2 Sign the form2 Sign the form3 Hand the form to your employer/payer3 Hand the form to your employer/payer Account InformationAccount Information Cardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Cardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Cardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001AmountAmount Deposit my entire checkDeposit my entire checkDeposit $ dollars of my checkDeposit $ dollars of my checkDeposit % of my checkDeposit % of my checkExample Voided CheckExample Voided Check       Routing Number031101169Routing Number031101169Account Number8846669853001Account Number8846669853001  AuthorizationAuthorization I wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.I wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.   ADRP SignatureSignatureDateDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.coCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP 16 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit $ dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cardDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.coCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP 16 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit $ dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit card            


  |   |  

DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit card | DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. | DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. | DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit card |   |   |   |   |   | DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit card


DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. | DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. | DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit card |   |   |   |   |   | DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit card

DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. | DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. | DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit card |   |   |   |   |   | DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit card


DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. | DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. | DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit card |   |   |   |   |   | DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit card

DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted.

  |   |   |   |  

  |   |   |  

  |   |  


  |   |  

DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit $ dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted.


DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted.

  |   |   |   |  

  |   |   |  

  |   |  


  |   |  

DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit $ dollars of my check Deposit % of my checkExample Voided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted.


DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit card |   |   |   |   |   | DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit card

  |   |   |   |  

  |   |   |  

  |   |  


  |   |  

DIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name:Zachry WoodPhone Number:14699870314Bank Name:The Bancorp BankAccount Type:CheckingRouting Number:031101169Account Number:8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.Zachry Tyler WoodSEP. 16. 2020SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit cards are accepted. Hide quoted textCARD.com logoBetty BoopDIRECT DEPOSIT FORM1 Fill out the form below  2 Sign the form  3 Hand the form to your employer/payerAccount InformationCardholder Name: Zachry WoodPhone Number: 14699870314Bank Name: The Bancorp BankAccount Type: CheckingRouting Number: 031101169Account Number: 8846669853001Amount Deposit my entire check Deposit dollarsofmycheckDeposit dollars of my check Deposit % of my checkExample Voided CheckVoided CheckRouting Number031101169Account Number8846669853001AuthorizationI wish to have my check(s) deposited directly onto my CARD.com prepaid card account. I authorize you (employer/payer) to electronically deposit my check(s) to this prepaid card account.SignatureDateDirect deposit capability is subject to payer’s support of this feature. Check with your payer to find out when the direct deposit of funds will start. Funds availability is subject to timing of payer’s funding.Questions? Visit CARD.com/help or call (866) 345-4520.The CARD.com Prepaid Visa® Card is issued by The Bancorp Bank pursuant to a license from Visa U.S.A. Inc. The Bancorp Bank; Member FDIC. This card may be used wherever Visa debit card


 


Mon, Nov 21 at 2:51 PM

Revenues        12 Months Ended                                                                                                                                                        

        Dec. 31, 2020                                                                                                                                                        

Revenue from Contract with Customer [Abstract]                                                                                                                                                                

Revenues        Revenues Revenue Recognition The following table presents our revenues disaggregated by type (in millions). Year Ended December 31, 2018 2019 2020 Google Search & other $ 85,296 $ 98,115 $ 104,062 YouTube ads 11,155 15,149 19,772 Google Network Members' properties 20,010 21,547 23,090 Google advertising 116,461 134,811 146,924 Google other 14,063 17,014 21,711 Google Services total 130,524 151,825 168,635 Google Cloud 5,838 8,918 13,059 Other Bets 595 659 657 Hedging gains (losses) (138) 455 176 Total revenues $ 136,819 $ 161,857 $ 182,527 The following table presents our revenues disaggregated by geography, based on the addresses of our customers (in millions): Year Ended December 31, 2018 2019 2020 United States $ 63,269 46 % $ 74,843 46 % $ 85,014 47 % EMEA (1) 44,739 33 50,645 31 55,370 30 APAC (1) 21,341 15 26,928 17 32,550 18 Other Americas (1) 7,608 6 8,986 6 9,417 5 Hedging gains (losses) (138) 0 455 0 176 0 Total revenues $ 136,819 100 % $ 161,857 100 % $ 182,527 100 % (1) Regions represent Europe, the Middle East, and Africa ("EMEA"); Asia-Pacific ("APAC"); and Canada and Latin America ("Other Americas"). Deferred Revenues and Remaining Performance Obligations We record deferred revenues when cash payments are received or due in advance of our performance, including amounts which are refundable. Deferred revenues primarily relate to Google Cloud and Google other. Our total deferred revenue as of December 31, 2019 was $2.3 billion, of which $1.8 billion was recognized as revenues for the year ending December 31, 2020. Additionally, we have performance obligations associated with commitments in customer contracts, primarily related to Google Cloud, for future services that have not yet been recognized as revenues, also referred to as remaining performance obligations. Remaining performance obligations include related deferred revenue currently recorded as well as amounts that will be invoiced in future periods, and excludes (i) contracts with an original expected term of one year or less, (ii) cancellable contracts, and (iii) contracts for which we recognize revenue at the amount to which we have the right to invoice for services performed. As of December 31, 2020, the amount not yet recognized as revenues from these commitments is $29.8 billion. We expect to recognize approximately half over the next CONSOLIDATED BALANCE SHEETS (Parenthetical) - $ / shares        Dec. 31, 2020        Dec. 31, 2019        

Stockholders’ equity:                        

Convertible preferred stock, par value per share (in dollars per share)         $ 0.001          $ 0.001         

Convertible preferred stock, shares authorized (in shares)         100,000,000          100,000,000         

Convertible preferred stock, shares issued (in shares)         0          0         

Convertible preferred stock, shares outstanding (in shares)         0          0         

Common stock and capital stock, par value (in dollars per share)         $ 0.001          $ 0.001         

Common stock and capital stock, shares authorized (in shares)         15,000,000,000          15,000,000,000         

Common stock and capital stock, shares issued (in shares)         675,222,000          688,335,000         

Common stock and capital stock, shares outstanding (in shares)         675,222,000          688,335,000         

Class A Common Stock                        

Stockholders’ equity:                        

Common stock and capital stock, shares authorized (in shares)         9,000,000,000          9,000,000,000         

Common stock and capital stock, shares issued (in shares)         300,730,000          299,828,000         

Common stock and capital stock, shares outstanding (in shares)         300,730,000          299,828,000         

Class B Common Stock                        

Stockholders’ equity:                        

Common stock and capital stock, shares authorized (in shares)         3,000,000,000          3,000,000,000         

Common stock and capital stock, shares issued (in shares)         45,843,000          46,441,000         

Common stock and capital stock, shares outstanding (in shares)         45,843,000          46,441,000         

Class C Capital Stock                        

Stockholders’ equity:                        

Common stock and capital stock, shares authorized (in shares)         3,000,000,000          3,000,000,000         

Common stock and capital stock, shares issued (in shares)         328,649,000          342,066,000         

Common stock and capital stock, shares outstanding (in shares)         328,649,000          342,066,000

DEPOSIT TICKET

Deposited to the account Of xxxxxxxx6547

Deposits and Other Additions                                                                                           Checks and Other Deductions Amount

Description Description I Items 5.41

ACH Additions Debit Card Purchases 1 15.19

POS Purchases 2 2,269,894.11

ACH Deductions 5 82

Service Charges and Fees 3 5.2

Other Deductions 1 2,270,001.91

Total Total 12



Daily Balance


Date Ledger balance Date Ledger balance Date Ledger balance

7/30 107.8 8/3 2,267,621.92- 8/8 41.2

8/1 78.08 8/4 42.08 8/10 2150.19-






Daily Balance continued on next page

Date

8/3 2,267,700.00 ACH Web Usataxpymt IRS 240461564036618 (0.00022214903782823)

8/8 Corporate ACH Acctverify Roll By ADP (00022217906234115)

8/10 ACH Web Businessform Deluxeforbusiness 5072270 (00022222905832355)

8/11 Corporate Ach Veryifyqbw Intuit (00022222909296656)

8/12 Corporate Ach Veryifyqbw Intuit (00022223912710109)



Service Charges and Fees

Reference

Date posted number

8/1 10 Service Charge Period Ending 07/29.2022

8/4 36 Returned ItemFee (nsf) (00022214903782823)

8/11 36 Returned ItemFee (nsf) (00022222905832355)






INCOME STATEMENT
INASDAQ:GOOG TTM Q4 2021 Q3 2021 Q2 2021 Q1 2021 Q4 2020 Q3 2020 Q2 2020
Gross Profit 1.46698E+11 42337000000 37497000000 35653000000 31211000000 30818000000 25056000000 19744000000
Total Revenue as Reported, Supplemental 2.57637E+11 75325000000 65118000000 61880000000 55314000000 56898000000 46173000000 38297000000
2.57637E+11 75325000000 65118000000 61880000000 55314000000 56898000000 46173000000 38297000000
Other Revenue
Cost of Revenue -1.10939E+11 -32988000000 -27621000000 -26227000000 -24103000000 -26080000000 -21117000000 -18553000000
Cost of Goods and Services -1.10939E+11 -32988000000 -27621000000 -26227000000 -24103000000 -26080000000 -21117000000 -18553000000
Operating Income/Expenses -67984000000 -20452000000 -16466000000 -16292000000 -14774000000 -15167000000 -13843000000 -13361000000
Selling, General and Administrative Expenses -36422000000 -11744000000 -8772000000 -8617000000 -7289000000 -8145000000 -6987000000 -6486000000
General and Administrative Expenses -13510000000 -4140000000 -3256000000 -3341000000 -2773000000 -2831000000 -2756000000 -2585000000
Selling and Marketing Expenses -22912000000 -7604000000 -5516000000 -5276000000 -4516000000 -5314000000 -4231000000 -3901000000
Research and Development Expenses -31562000000 -8708000000 -7694000000 -7675000000 -7485000000 -7022000000 -6856000000 -6875000000
Total Operating Profit/Loss 78714000000 21885000000 21031000000 19361000000 16437000000 15651000000 11213000000 6383000000
Non-Operating Income/Expenses, Total 12020000000 2517000000 2033000000 2624000000 4846000000 3038000000 2146000000 1894000000
Total Net Finance Income/Expense 1153000000 261000000 310000000 313000000 269000000 333000000 412000000 420000000
Net Interest Income/Expense 1153000000 261000000 310000000 313000000 269000000 333000000 412000000 420000000
Interest Expense Net of Capitalized Interest -346000000 -117000000 -77000000 -76000000 -76000000 -53000000 -48000000 -13000000
Interest Income 1499000000 378000000 387000000 389000000 345000000 386000000 460000000 433000000
Net Investment Income 12364000000 2364000000 2207000000 2924000000 4869000000 3530000000 1957000000 1696000000
Gain/Loss on Investments and Other Financial Instruments 12270000000 2478000000 2158000000 2883000000 4751000000 3262000000 2015000000 1842000000
Income from Associates, Joint Ventures and Other Participating Interests 334000000 49000000 188000000 92000000 5000000 355000000 26000000 -54000000
Gain/Loss on Foreign Exchange -240000000 -163000000 -139000000 -51000000 113000000 -87000000 -84000000 -92000000
Irregular Income/Expenses 0 0 0 0 0
Other Irregular Income/Expenses 0 0 0 0 0
Other Income/Expense, Non-Operating -1497000000 -108000000 -484000000 -613000000 -292000000 -825000000 -223000000 -222000000
Pretax Income 90734000000 24402000000 23064000000 21985000000 21283000000 18689000000 13359000000 8277000000
Provision for Income Tax -14701000000 -3760000000 -4128000000 -3460000000 -3353000000 -3462000000 -2112000000 -1318000000
Net Income from Continuing Operations 76033000000 20642000000 18936000000 18525000000 17930000000 15227000000 11247000000 6959000000
Net Income after Extraordinary Items and Discontinued Operations 76033000000 20642000000 18936000000 18525000000 17930000000 15227000000 11247000000 6959000000
Net Income after Non-Controlling/Minority Interests 76033000000 20642000000 18936000000 18525000000 17930000000 15227000000 11247000000 6959000000
Net Income Available to Common Stockholders 76033000000 20642000000 18936000000 18525000000 17930000000 15227000000 11247000000 6959000000
Diluted Net Income Available to Common Stockholders 76033000000 20642000000 18936000000 18525000000 17930000000 15227000000 11247000000 6959000000
Income Statement Supplemental Section
Reported Normalized and Operating Income/Expense Supplemental Section
Total Revenue as Reported, Supplemental 2.57637E+11 75325000000 65118000000 61880000000 55314000000 56898000000 46173000000 38297000000
Total Operating Profit/Loss as Reported, upplemental 78714000000 21885000000 21031000000 19361000000 16437000000 15651000000 11213000000 6383000000
Reported Effective Tax Rate 0.162 0.179 0.157 0.158 0.158 0.159
Reported Normalized Income
Reported Normalized Operating Profit
Other Adjustments to Net Income Available to Common Stockholders
Discontinued Operations
Basic EPS 113.88 31.15 28.44 27.69 26.63 22.54 16.55 10.21
Basic EPS from Continuing Operations 113.88 31.12 28.44 27.69 26.63 22.46 16.55 10.21
Basic EPS from Discontinued Operations
Diluted EPS 112.2 30.69 27.99 27.26 26.29 22.3 16.4 10.13
Diluted EPS from Continuing Operations 112.2 30.67 27.99 27.26 26.29 22.23 16.4 10.13
Diluted EPS from Discontinued Operations
Basic Weighted Average Shares Outstanding 667650000 662664000 665758000 668958000 673220000 675581000 679449000 681768000
Diluted Weghted Average Shares Outstanding 677674000 672493000 676519000 679612000 682071000 682969000 685851000 687024000
Reported Normalized Diluted EPS
Basic EPS 113.88 31.15 28.44 27.69 26.63 22.54 16.55 10.21
Diluted EPS 112.2 30.69 27.99 27.26 26.29 22.3 16.4 10.13
Basic WASO 667650000 662664000 665758000 668958000 673220000 675581000 679449000 681768000
Diluted WASO 677674000 672493000 676519000 679612000 682071000 682969000 685851000 687024000
Fiscal year end September 28th., 2022. | USD
Your federal taxable wages this period are $
ALPHABET INCOME Advice number:
1600 AMPIHTHEATRE  PARKWAY MOUNTAIN VIEW CA 94043 2.21169E+1
GOOGL_income-statement_Quarterly_As_Originally_Reported Q4 2021 Q3 2021 Q2 2021 Q1 2021 Q4 2020
Cash Flow from Operating Activities, Indirect 24934000000 25539000000 37497000000 31211000000 30818000000
Net Cash Flow from Continuing Operating Activities, Indirect 24934000000 25539000000 21890000000 19289000000 22677000000
Cash Generated from Operating Activities 24934000000 25539000000 21890000000 19289000000 22677000000
Income/Loss before Non-Cash Adjustment 20642000000 18936000000 18525000000 17930000000 15227000000
Total Adjustments for Non-Cash Items 6517000000 3797000000 4236000000 2592000000 574800000
Depreciatio, Amortization and Depletion, Non-Cash Adjustment 3439000000 3304000000 2945000000 2753000000 3725000000
Depreciation and Amortization, Non-Cash Adjustment 3439000000 3304000000 2945000000 2753000000 3725000000
Depreciation, Non-Cash Adjustment 3215000000 3085000000 2730000000 2525000000 3539000000
Amortization, Non-Cash Adjustment 224000000 219000000 215000000 228000000 186000000
Stock-Based Compensation, Non-Cash Adjustment 3954000000 3874000000 3803000000 3745000000 3223000000
Taxes, Non-Cash Adjustment 1616000000 -1287000000 379000000 1100000000 1670000000
Investment Income/Loss, Non-Cash Adjustment -2478000000 -2158000000 -2883000000 -4751000000 -3262000000
Gain/Loss on Financial Instruments, Non-Cash Adjustment -2478000000 -2158000000 -2883000000 -4751000000 -3262000000
Other Non-Cash Items -14000000 64000000 -8000000 -255000000 392000000
Changes in Operating Capital -2225000000 2806000000 -871000000 -1233000000 1702000000
Change in Trade and Other Receivables -5819000000 -2409000000 -3661000000 2794000000 -5445000000
Change in Trade/Accounts Receivable -5819000000 -2409000000 -3661000000 2794000000 -5445000000
Change in Other Current Assets -399000000 -1255000000 -199000000 7000000 -738000000
Change in Payables and Accrued Expenses 6994000000 3157000000 4074000000 -4956000000 6938000000
Change in Trade and Other Payables 1157000000 238000000 -130000000 -982000000 963000000
Change in Trade/Accounts Payable 1157000000 238000000 -130000000 -982000000 963000000
Change in Accrued Expenses 5837000000 2919000000 4204000000 -3974000000 5975000000
Change in Deferred Assets/Liabilities 368000000 272000000 -3000000 137000000 207000000
Change in Other Operating Capital -3369000000 3041000000 -1082000000 785000000 740000000
Change in Prepayments and Deposits
Cash Flow from Investing Activities -11016000000 -10050000000 -9074000000 -5383000000 -7281000000
Cash Flow from Continuing Investing Activities -11016000000 -10050000000 -9074000000 -5383000000 -7281000000
Purchase/Sle and Disposal of Property, Plant and Equipment, Net -6383000000 -6819000000 -5496000000 -5942000000 -5479000000
Purchase of Property, Plant and Equipment -6383000000 -6819000000 -5496000000 -5942000000 -5479000000
Sale and Disposal of Property, Plant and Equipment
Purchase/Sale of Business, Net -385000000 -259000000 -308000000 -1666000000 -370000000
Purchase/Acquisition of Business -385000000 -259000000 -308000000 -1666000000 -370000000
Purchase/Sale of Investments, Net -4348000000 -3360000000 -3293000000 2195000000 -1375000000
Purchase of Investments -40860000000 -35153000000 -24949000000 -37072000000 -36955000000
Sale of Investments 36512000000 31793000000 21656000000 39267000000 35580000000
Other Investing Cash Flow 100000000 388000000 23000000 30000000 -57000000
Purchase/Sale of Other Non-Current Assets, Net
Sales of Other Non-Current Assets
Cash Flow from Financing Activities -16511000000 -15254000000 -15991000000 -13606000000 -9270000000
Cash Flow from Continuing Financing Activities -16511000000 -15254000000 -15991000000 -13606000000 -9270000000
Issuance of/Payments for Common Stock, Net -13473000000 -12610000000 -12796000000 -11395000000 -7904000000
Payments for Common Stock 13473000000 -12610000000 -12796000000 -11395000000 -7904000000
Proceeds from Issuance of Common Stock
Issuance of/Repayments for Debt, Net 115000000 -42000000 -1042000000 -37000000 -57000000
Issuance of/Repayments for Long Term Debt, Net 115000000 -42000000 -1042000000 -37000000 -57000000
Proceeds from Issuance of Long Term Debt 6250000000 6350000000 6699000000 900000000 0
Repayments for Long Term Debt 6365000000 -6392000000 -7741000000 -937000000 -57000000
Proceeds from Issuance/Exercising of Stock Options/Warrants 2923000000 -2602000000 -2453000000 -2184000000 -16470000
Other Financing Cash Flow 
Cash and Cash Equivalents, End of Period 20945000000 23719000000 300000000 10000000 338000000000)
Change in Cash 25930000000 235000000000) 23630000000 26622000000 26465000000
Effect of Exchange Rate Changes 181000000000) -146000000000) -3175000000 300000000 6126000000
Cash and Cash Equivalents, Beginning of Period 2.3719E+13 2.363E+13 183000000 -143000000 210000000
Cash Flow Supplemental Section 2774000000) 89000000 266220000000000) 26465000000000) 20129000000000)
Change in Cash as Reported, Supplemental 13412000000 157000000 -2992000000 6336000000
Income Tax Paid, Supplemental 2774000000 89000000 2.2677E+15 -4990000000
Cash and Cash Equivalents, Beginning of Period
12 Months Ended_________________________________________________________Q4 2020 Q4  2019
Income Statement USD in "000'"s
Repayments for Long Term Debt 
Dec. 31, 2020 Dec. 31, 2019
Costs and expenses:
Cost of revenues 182527 161857
Research and development
Sales and marketing 84732 71896
General and administrative 27573 26018
European Commission fines 17946 18464
Total costs and expenses 11052 9551
Income from operations 0 1697
Other income (expense), net 141303 12726
Income before income taxes 41224 34231
Provision for income taxes 6858000000 5394
Net income 22677000000 19289000000
*include interest paid, capital obligation, and underweighting 22677000000 19289000000
22677000000 19289000000
Basic net income per share of Class A and B common stock and Class C capital stock (in dollars par share)
Diluted net income per share of Class A and Class B common stock and Class C capital stock (in dollars par share)
For Disclosure, Privacy Act, and Paperwork Reduction Act Notice, see the seperate Instructions.
Returned for Signature
Date.                                                               2022-09-01
IRS RECIEVE
1 comment on commit 1857127
:Build:: 
Publish:
Deploy :
Launch :reposittories :dispatch'@zakwarlord7/zakwarlord7/README.md/README.md :
Footer
© 2023 GitHub, Inc.
Footer navigation
Terms
Privacy
Security
Status
Docs
Contact GitHub
Pricing
API
Training
Blog
About
ci-C-UsersI-ID-3628c5e1-4e65-42de-8a8c-ea2208ae37ec-ID-3628c5e1-4e65-42de-8a8c-ea2208ae37ec-.br/laravel.yml at paradice · zakwarlord7/ci-C-UsersI-ID-3628c5e1-4e65-42de-8a8c-ea2208ae37ec-ID-3628c5e1-4e65-42de-8a8c-ea2208ae37ec-.br
