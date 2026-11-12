BluePeak phone scanner / admin fixes

This is a PATCH bundle, not a complete repository. Extract it into the repository root and replace the four files at the same paths:
- admin-dashboard.html
- api/gateway.js
- bluepeak-access-ui.js
- test-gateway-auth.js

The remaining files are not included. There are no Git credentials, .env files, tokens, or passwords in this patch. After adding the files to the GitHub repository, allow the connected Vercel project to deploy the new main commit, then verify the deployment.
