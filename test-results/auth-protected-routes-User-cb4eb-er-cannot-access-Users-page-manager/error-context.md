# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth\protected-routes.spec.ts >> User without permission sees access denied >> regular user cannot access Users page
- Location: e2e\tests\auth\protected-routes.spec.ts:68:7

# Error details

```
Error: Error reading storage state from storage/user.json:
ENOENT: no such file or directory, open 'C:\Users\User\Desktop\systems\asset_mngmnt\storage\user.json'
```