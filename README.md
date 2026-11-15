# PSU Performance Board

A dashboard on India's central public sector enterprises (CPSEs): how they perform and what the Government earns from them. Economics and Finance II Division, NITI Aayog. Every figure is read from an official source: DPE's Public Enterprises Survey (via PIB and DPE's own PDFs) and DIPAM, Ministry of Finance. Built by `scripts/build_psu.py` into `public/data/psu/psu.json`, refreshed daily by GitHub Actions and published on GitHub Pages.

| Section | Source | How it updates |
|---|---|---|
| Company-wise net profit or loss, 2022-23 to 2024-25 (289 operating CPSEs, 20 cognate groups) | DPE's Public Enterprises Survey 2024-25, as laid in the reply to Lok Sabha Unstarred Question 2941 (10 March 2026), read from the PIB release | Automatic; the PIB tables are checked against their own sub totals and grand totals |
| Contribution to the Central Exchequer, three years | Statement J of the Public Enterprises Survey 2024-25 (PDF on dpe.gov.in) | Automatic |
| Survey headlines 2017-18 to 2023-24 (profit, loss, revenue, exchequer, dividend, investment, net worth) | Each year's survey release on PIB and the 2022-23 and 2023-24 survey volumes | Hand-kept in `data/psu/pe-survey-headlines.csv`, one source link per figure |
| Capex against target, MoU ratings, CPSE counts, employment, value added | Public Enterprises Survey 2023-24 tables | Hand-kept in `data/psu/pe-survey-tables.json` with table and page numbers |
| Dividend, disinvestment and asset monetisation receipts since 2014-15 | DIPAM, Total Receipts | Automatic, daily |
| Dividend from each company, 2019-20 onward | DIPAM, Dividend Receipts (the JSON behind the page) | Automatic, daily |
| Stake sales of the current year | DIPAM, Disinvestment Receipts | Automatic; each year's list is kept in `data/psu/disinvestment-deals.csv` because DIPAM's page shows only the current year |
| Market value of the Government's shares in listed CPSEs, banks and insurers | DIPAM, Market Capital Value of GoI Equity | Automatic; one row a day in `data/psu/mcap-snapshots.csv` (the page carries no date) |

```bash
python3 scripts/build_psu.py                      # all sources
python3 scripts/build_psu.py --only dividends     # one source
npm ci && npm run dev                             # then open http://localhost:5173/
```

Things to know:

- **Two dividend figures.** DPE counts dividend declared by CPSEs to all shareholders; DIPAM counts what the Centre receives, including from banks, insurers and minority holdings such as Hindustan Zinc. The board labels which is which.
- **Revisions.** Each year in the history comes from that year's own survey (2017-18 from the 2018-19 survey, 2021-22 from the 2022-23 survey). Later surveys revise earlier years slightly, for example 2022-23 overall net profit 2.12 (own survey) against 2.18 lakh crore (2023-24 survey).
- **2020-21 is missing**, and so are the 2024-25 revenue, investment and chapter tables: they are only on DPE's report portal (`reports-pesurvey.dpe.gov.in`), whose server leaves out Sectigo's intermediate certificate and whose issuer link is plain HTTP, which this cloud environment cannot fetch. GitHub's runners can; a later step could add that portal the same way the MSME source handles GlobalSign.
- **DPE's main site** is a JavaScript app that refuses headless browsers, so the board uses the PDF files DPE publishes under `www.dpe.gov.in/static/uploads/` and PIB releases.
- **Each year, by hand:** when the next Public Enterprises Survey is laid, add its headline row to `data/psu/pe-survey-headlines.csv`, refresh `pe-survey-tables.json` from its tables, and point `PIB_PROFIT` and `DPE_STATEMENT_J` in `scripts/build_psu.py` at the new release and statement.
- **Network.** The build needs `dipam.gov.in`, `www.pib.gov.in` and `www.dpe.gov.in`.

## Publishing (one-time)

In the repository's Settings, Pages, set Source to "GitHub Actions". After that every push to `main`, and the daily run at 18:10 IST, rebuilds and publishes the site.
