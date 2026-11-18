# Toronto & GTA MOVE Guide

A static homeowner guide by Tsering Chogyal, Century 21 People’s Choice Realty Inc. Open `public/index.html` in a browser to preview. The site needs no build tools or dependencies. Financial inputs stay in the browser during the visit. Use **Print / Save as PDF** to keep a copy.

## Put the files on GitHub

1. Unzip the download and open the `toronto-move-guide` folder.
2. [Create a GitHub repository](https://github.com/new). A private repository works with Cloudflare Pages. If using GitHub’s browser upload, initialize the repository with a README, then replace it with this one when you upload.
3. In the repository, use **Add file → Upload files**. Upload this README and the entire `public` folder. Check that GitHub shows `public/index.html` and `public/assets/` before committing to `main`.

## Deploy with Cloudflare Pages

1. Open [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages). Choose **Create application → Pages → Connect to Git** or **Import an existing Git repository**.
2. Connect GitHub and grant access to the guide repository. Select it and choose **Begin setup**.
3. Use the following settings and select **Save and Deploy**.

| Setting | Value |
| --- | --- |
| Project name | `toronto-move-guide` or another available name |
| Production branch | `main` |
| Framework preset | None |
| Build command | Leave blank |
| Build output directory | `public` |
| Root directory | Leave blank |

4. Open the assigned `pages.dev` URL. Try both strategies, switch between Toronto and elsewhere in Ontario, enter two closing dates, check an item, and save the plan as a PDF. On a phone, confirm all three brand images are present where expected (personal logo in the header, headshot by the contact details, brokerage logo in the footer). Push edits to `main` for future production deployments.

[Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/) · [Static HTML deployment guide](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)

## Evaluation form and MOVE replies

The evaluation form currently prepares a draft addressed to `tsechogyal@gmail.com` in the visitor’s email app. The visitor reviews and sends the email themselves. The guide does not post their details to a server in this mode.

For direct delivery, connect a hosted form service or an HTTPS endpoint that accepts JSON POST requests with `name`, `email`, `address`, `phone`, `type`, `size`, `condition`, `timing` and `notes`. Set the form’s `data-endpoint` attribute in `public/index.html` once the endpoint is configured. An external endpoint must allow requests from the deployed domain. Keep mail credentials on the server, validate the fields on the server and set up spam protection there. Send to the business inbox using a verified sender and use the visitor’s email as the reply address. Update the privacy notice for the chosen service. Test a successful submission, inbox receipt, reply address, and an error response before promoting the form. No hosted delivery is configured in this package.

After the site is live, use its public URL in your Instagram and Facebook MOVE replies. Configure the keyword and destination for each channel in the account’s selected messaging tool. From an account outside the business, trigger each flow separately and confirm that the reply arrives and opens the guide on mobile. No Instagram or Facebook workflow is configured in this package.

## Maintaining the calculator

`public/finance.js` contains the tax schedules and calculation logic. It uses Toronto’s April 1, 2026 high-value residential brackets, standard Ontario brackets and separate optional ownership-share rebates. The estimator models standard resale financing and its displayed assumptions. Review the official sources linked in the calculator when rates or policies change. Paid deposits should be included in the pre-deposit cash amount, as described in the guide.
