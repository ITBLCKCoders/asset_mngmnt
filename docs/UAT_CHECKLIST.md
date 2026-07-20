# User Acceptance Testing (UAT) Checklist
## Asset Management System

**UAT Period:** July 13–17, 2026
**Participants:** CMTH and all subsidiaries
**Environment:** Local / On-Premises
**Facilitator:** Ryan Rey Magdalita

---

## Instructions for Testers

1. Execute each test case following the steps provided
2. Mark **Pass** if actual result matches expected, **Fail** if not, **N/A** if not applicable
3. For failures, describe what happened in **Actual Result**
4. Log all failures with the facilitator for defect tracking
5. Use the **Remarks** column for observations or suggestions

### Status Legend

| Status | Meaning |
|---|---|
| ✅ Pass | Matches expected result |
| ❌ Fail | Does not match expected result |
| ⚪ N/A | Not testable in current environment |

---

## Day 1 — Monday, July 13: Core Asset Management

### TC-AS-01 — Create an Asset (IT Scope)
| Field | Details |
|---|---|
| **Day** | 1 |
| **Module** | Asset Core |
| **Priority** | High |
| **Pre-condition** | Logged in as Asset Administrator, company selected |
| **Steps** | 1. Navigate to Assets → Asset List → click "Add Asset"<br>2. Fill all required fields: name, category, type, brand, model, serial number, purchase date, value, useful life<br>3. Select scope: IT Asset<br>4. Upload an image (JPG/PNG)<br>5. Click Save |
| **Expected Result** | Asset is created with a unique code (e.g., AST-001). Appears in Asset List immediately. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AS-02 — Create an Asset (Admin Scope)
| Field | Details |
|---|---|
| **Day** | 1 |
| **Module** | Asset Core |
| **Priority** | Medium |
| **Pre-condition** | Logged in as Asset Administrator |
| **Steps** | 1. Navigate to Assets → Add Asset<br>2. Fill required fields<br>3. Select scope: Admin Asset<br>4. Click Save |
| **Expected Result** | Asset is created. Visible only under Admin scope filter. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AS-03 — Edit an Existing Asset
| Field | Details |
|---|---|
| **Day** | 1 |
| **Module** | Asset Core |
| **Priority** | High |
| **Pre-condition** | At least one asset exists |
| **Steps** | 1. Go to Asset List<br>2. Click on an asset to open details<br>3. Click Edit<br>4. Change name, category, and value<br>5. Click Save |
| **Expected Result** | Changes are saved and reflected immediately in Asset List and detail view. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AS-04 — Delete an Asset
| Field | Details |
|---|---|
| **Day** | 1 |
| **Module** | Asset Core |
| **Priority** | Medium |
| **Pre-condition** | Asset exists with no active assignments |
| **Steps** | 1. Go to Asset List<br>2. Click delete/archive on an asset<br>3. Confirm deletion |
| **Expected Result** | Asset is removed from active list (or archived). Confirmation message shown. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AS-05 — Search Assets by Code / Name
| Field | Details |
|---|---|
| **Day** | 1 |
| **Module** | Asset Core |
| **Priority** | High |
| **Pre-condition** | Multiple assets exist |
| **Steps** | 1. Go to Asset List<br>2. Type partial asset code in search bar (e.g., "AST-0")<br>3. Clear and search by asset name |
| **Expected Result** | Results filter in real-time as you type. Matching assets displayed. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AS-06 — Filter by Category / Status / Company
| Field | Details |
|---|---|
| **Day** | 1 |
| **Module** | Asset Core |
| **Priority** | Medium |
| **Pre-condition** | Assets in multiple categories and statuses exist |
| **Steps** | 1. Go to Asset List<br>2. Apply category filter → select a category<br>3. Apply status filter → select "Available"<br>4. Apply company filter → switch company |
| **Expected Result** | List updates to show only matching assets. Filter badges/chips shown. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AS-07 — Pagination & Page Size
| Field | Details |
|---|---|
| **Day** | 1 |
| **Module** | Asset Core |
| **Priority** | Medium |
| **Pre-condition** | Enough assets to span multiple pages |
| **Steps** | 1. Go to Asset List<br>2. Navigate to page 2, then page 3<br>3. Change page size from 10 to 25 to 50 |
| **Expected Result** | Data loads correctly per page. Page indicator shows correct totals. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AS-08 — Export Assets (Excel)
| Field | Details |
|---|---|
| **Day** | 1 |
| **Module** | Asset Core |
| **Priority** | Medium |
| **Pre-condition** | Assets exist in list |
| **Steps** | 1. Go to Asset List<br>2. Click Export → Excel |
| **Expected Result** | .xlsx file downloads with current asset list data. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AS-09 — Export Assets (PDF)
| Field | Details |
|---|---|
| **Day** | 1 |
| **Module** | Asset Core |
| **Priority** | Medium |
| **Pre-condition** | Assets exist in list |
| **Steps** | 1. Go to Asset List<br>2. Click Export → PDF |
| **Expected Result** | PDF file downloads with formatted asset list data. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AS-10 — Assign Asset to User
| Field | Details |
|---|---|
| **Day** | 1 |
| **Module** | Assignment |
| **Priority** | High |
| **Pre-condition** | Asset is in "Available" status. Target user exists. |
| **Steps** | 1. Go to Asset Assignment page<br>2. Select an available asset<br>3. Select target user<br>4. Set assignment date<br>5. Click Assign |
| **Expected Result** | Asset status changes to "Assigned". User can see it in "My Assets". Assignment history recorded. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AS-11 — View Assignment History
| Field | Details |
|---|---|
| **Day** | 1 |
| **Module** | Assignment |
| **Priority** | Medium |
| **Pre-condition** | Asset has prior assignment history |
| **Steps** | 1. Open any assigned asset's details<br>2. Scroll to Assignment History section |
| **Expected Result** | Complete timeline of all past assignments with dates and users. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AS-12 — My Assets Page
| Field | Details |
|---|---|
| **Day** | 1 |
| **Module** | My Assets |
| **Priority** | High |
| **Pre-condition** | Logged in as a user with assigned assets |
| **Steps** | 1. Navigate to My Assets<br>2. Verify all assigned assets are listed<br>3. Click on an asset to view details |
| **Expected Result** | Only assets assigned to current user are shown. Correct statuses displayed. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AS-13 — Public Asset Detail (QR Link)
| Field | Details |
|---|---|
| **Day** | 1 |
| **Module** | Asset Core |
| **Priority** | Medium |
| **Pre-condition** | Asset exists with known code |
| **Steps** | 1. Open a browser in incognito/private mode (not logged in)<br>2. Navigate to `/assets/details/AST-001` (or similar)<br>3. Verify public asset info is displayed |
| **Expected Result** | Public asset detail page loads with basic info (no edit/delete actions). |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

## Day 2 — Tuesday, July 14: Asset Workflows

### TC-WF-01 — Create Asset Return Request
| Field | Details |
|---|---|
| **Day** | 2 |
| **Module** | Returns |
| **Priority** | High |
| **Pre-condition** | User has an assigned asset |
| **Steps** | 1. Navigate to Asset Return<br>2. Select an assigned asset<br>3. Fill return reason and condition notes<br>4. Upload condition images (if applicable)<br>5. Submit return request |
| **Expected Result** | Return request created with "Pending" status. Admin can see the request. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-WF-02 — Process Batch Return
| Field | Details |
|---|---|
| **Day** | 2 |
| **Module** | Returns |
| **Priority** | Medium |
| **Pre-condition** | Multiple assets eligible for return |
| **Steps** | 1. Go to Asset Return page<br>2. Select multiple assets<br>3. Submit batch return<br>4. Admin processes the batch |
| **Expected Result** | All selected assets are returned in one operation. Statuses update for all. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-WF-03 — Initiate Asset Transfer
| Field | Details |
|---|---|
| **Day** | 2 |
| **Module** | Transfers |
| **Priority** | High |
| **Pre-condition** | Asset is assigned to a user |
| **Steps** | 1. Go to Asset Transfer page<br>2. Select an assigned asset<br>3. Select receiving user/department<br>4. Add transfer notes<br>5. Submit transfer request |
| **Expected Result** | Transfer request created with "Pending Approval" status. Notification sent to approver. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-WF-04 — Approve & Complete Transfer
| Field | Details |
|---|---|
| **Day** | 2 |
| **Module** | Transfers |
| **Priority** | High |
| **Pre-condition** | Pending transfer request exists |
| **Steps** | 1. Log in as approver<br>2. Go to Approvals or Transfer Requests<br>3. Review pending transfer<br>4. Click Approve<br>5. Capture wet signature (if required) |
| **Expected Result** | Transfer completed. Asset reassigned to new user. Transfer form finalized. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-WF-05 — Reject Transfer Request
| Field | Details |
|---|---|
| **Day** | 2 |
| **Module** | Transfers |
| **Priority** | Medium |
| **Pre-condition** | Pending transfer request exists |
| **Steps** | 1. Log in as approver<br>2. Go to pending transfer request<br>3. Click Reject<br>4. Provide rejection reason |
| **Expected Result** | Transfer request rejected. Status updated. Initiator notified. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-WF-06 — Create Borrow Request
| Field | Details |
|---|---|
| **Day** | 2 |
| **Module** | Borrow |
| **Priority** | High |
| **Pre-condition** | Asset is "Available" |
| **Steps** | 1. Go to Asset Borrowing page<br>2. Select an available asset<br>3. Set borrow start and end dates<br>4. Add purpose/notes<br>5. Submit |
| **Expected Result** | Borrow request created. Status: "Pending Approval". |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-WF-07 — Approve & Receive Borrow
| Field | Details |
|---|---|
| **Day** | 2 |
| **Module** | Borrow |
| **Priority** | High |
| **Pre-condition** | Pending borrow request exists |
| **Steps** | 1. Admin approves borrow request<br>2. User goes to borrow requests<br>3. User clicks "Receive" to acknowledge receipt<br>4. Admin confirms borrower received |
| **Expected Result** | Asset marked as "Borrowed". Borrow period tracked. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-WF-08 — Return Borrowed Asset
| Field | Details |
|---|---|
| **Day** | 2 |
| **Module** | Borrow |
| **Priority** | Medium |
| **Pre-condition** | Asset is currently borrowed |
| **Steps** | 1. User initiates return of borrowed asset<br>2. Admin confirms receipt<br>3. Verify asset status |
| **Expected Result** | Asset status returns to "Available". Borrow record closed. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-WF-09 — Asset Disposal
| Field | Details |
|---|---|
| **Day** | 2 |
| **Module** | Disposal |
| **Priority** | Medium |
| **Pre-condition** | Asset exists (retired or end-of-life) |
| **Steps** | 1. Go to Asset Disposal page<br>2. Select asset for disposal<br>3. Fill disposal reason, method, date<br>4. Submit disposal |
| **Expected Result** | Asset status changes to "Disposed". Disposal record created. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-MT-01 — Schedule Asset Maintenance
| Field | Details |
|---|---|
| **Day** | 2 |
| **Module** | Maintenance |
| **Priority** | High |
| **Pre-condition** | Asset exists and is assigned or available |
| **Steps** | 1. Go to Asset Maintenance page<br>2. Click "Add Maintenance"<br>3. Select asset<br>4. Set maintenance type (preventive / corrective)<br>5. Set scheduled date, assign technician/vendor<br>6. Add notes and estimated cost<br>7. Click Save |
| **Expected Result** | Maintenance record created with "Scheduled" status. Asset shows as under maintenance. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-MT-02 — Complete Maintenance & Update Record
| Field | Details |
|---|---|
| **Day** | 2 |
| **Module** | Maintenance |
| **Priority** | High |
| **Pre-condition** | Maintenance record exists with "Scheduled" or "In Progress" status |
| **Steps** | 1. Open the pending maintenance record<br>2. Mark as "In Progress"<br>3. Add completion notes, parts used, final cost<br>4. Upload completion documents (if any)<br>5. Mark as "Completed" |
| **Expected Result** | Maintenance record marked completed. Asset status restored to previous state. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-MT-03 — View Maintenance History
| Field | Details |
|---|---|
| **Day** | 2 |
| **Module** | Maintenance |
| **Priority** | Medium |
| **Pre-condition** | Asset has past maintenance records |
| **Steps** | 1. Open an asset's detail view<br>2. Scroll to Maintenance History section<br>3. Review past maintenance entries |
| **Expected Result** | Complete history of all maintenance activities shown with dates, type, technician, and cost. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

## Day 3 — Wednesday, July 15: Forms & Approvals

### TC-FM-01 — Generate Accountability Form
| Field | Details |
|---|---|
| **Day** | 3 |
| **Module** | Accountability Form |
| **Priority** | High |
| **Pre-condition** | User has assigned assets |
| **Steps** | 1. Go to Forms → Accountability Form<br>2. Select assigned assets to include<br>3. Click Generate Form<br>4. Review the generated form |
| **Expected Result** | Form is generated listing all selected assets with their details. Ready for signature. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-FM-02 — Sign Accountability Form (Employee)
| Field | Details |
|---|---|
| **Day** | 3 |
| **Module** | Accountability Form |
| **Priority** | High |
| **Pre-condition** | Unsigned accountability form exists |
| **Steps** | 1. Open the generated accountability form<br>2. Click Sign as Employee<br>3. Draw/capture digital signature<br>4. Confirm signature |
| **Expected Result** | Employee signature captured and saved. Form status updates. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-FM-03 — Sign Accountability Form (IT Head)
| Field | Details |
|---|---|
| **Day** | 3 |
| **Module** | Accountability Form |
| **Priority** | High |
| **Pre-condition** | Employee has signed the form |
| **Steps** | 1. Log in as IT Head<br>2. Open the pending accountability form<br>3. Click Sign as IT Head<br>4. Draw/capture digital signature<br>5. Confirm signature |
| **Expected Result** | IT Head signature captured. Form is finalized. PDF available for download. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-FM-04 — Print Accountability Form PDF
| Field | Details |
|---|---|
| **Day** | 3 |
| **Module** | Accountability Form |
| **Priority** | Medium |
| **Pre-condition** | Fully signed accountability form |
| **Steps** | 1. Open a finalized (signed) accountability form<br>2. Click Print / Download PDF |
| **Expected Result** | PDF generates with all signatures, asset list, and form details visible. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-FM-05 — Create & Sign Asset Return Form
| Field | Details |
|---|---|
| **Day** | 3 |
| **Module** | Return Form |
| **Priority** | High |
| **Pre-condition** | Asset has been returned |
| **Steps** | 1. Go to Forms → Return Form<br>2. Select returned asset<br>3. Generate form<br>4. Employee signs<br>5. Admin/IT Head signs |
| **Expected Result** | Return form created and signed by both parties. PDF downloadable. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-FM-06 — Create & Sign Asset Transfer Form
| Field | Details |
|---|---|
| **Day** | 3 |
| **Module** | Transfer Form |
| **Priority** | High |
| **Pre-condition** | Asset transfer has been approved |
| **Steps** | 1. Go to Forms → Transfer Form<br>2. Select completed transfer<br>3. Generate transfer form<br>4. Sender signs<br>5. Receiver signs<br>6. Admin/IT Head signs |
| **Expected Result** | Transfer form with all three signatures. PDF available. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-FM-07 — Create & Sign Asset Checklist Form
| Field | Details |
|---|---|
| **Day** | 3 |
| **Module** | Checklist Form |
| **Priority** | High |
| **Pre-condition** | Asset exists with checklist items defined |
| **Steps** | 1. Go to Forms → Checklist Form<br>2. Select asset<br>3. Fill checklist items (condition, accessories, documents)<br>4. Employee signs<br>5. Dept Head signs<br>6. IT Manager signs (if applicable) |
| **Expected Result** | Checklist form completed with multi-party signatures. PDF generated. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-FM-08 — Create & Sign Borrow Form
| Field | Details |
|---|---|
| **Day** | 3 |
| **Module** | Borrow Form |
| **Priority** | High |
| **Pre-condition** | Borrow request has been approved |
| **Steps** | 1. Go to Forms → Borrow Form<br>2. Select completed borrow<br>3. Generate form<br>4. Borrower signs<br>5. Admin/approver signs |
| **Expected Result** | Borrow form created with signatures. PDF downloadable. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-FM-09 — Centralized Approvals Dashboard
| Field | Details |
|---|---|
| **Day** | 3 |
| **Module** | Approvals |
| **Priority** | Medium |
| **Pre-condition** | Multiple pending approvals exist (transfers, borrows, forms) |
| **Steps** | 1. Go to Approvals page<br>2. View all pending approvals grouped by type<br>3. Approve one, reject another<br>4. Verify approval counts update |
| **Expected Result** | All pending approvals listed in one place. Approve/reject actions work. Counts refresh. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

## Day 4 — Thursday, July 16: Admin & Advanced Features

### TC-AD-01 — Create a New User
| Field | Details |
|---|---|
| **Day** | 4 |
| **Module** | User Management |
| **Priority** | High |
| **Pre-condition** | Logged in as Global Admin or Admin |
| **Steps** | 1. Go to Users page<br>2. Click "Add User"<br>3. Fill required fields: name, email, role, company<br>4. Set initial password<br>5. Click Save |
| **Expected Result** | User created. Invitation/credentials sent. User appears in user list. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AD-02 — Assign Role & Verify Permissions
| Field | Details |
|---|---|
| **Day** | 4 |
| **Module** | RBAC |
| **Priority** | High |
| **Pre-condition** | User exists with no special permissions |
| **Steps** | 1. Edit a user<br>2. Assign a role (e.g., "IT Asset User")<br>3. Save<br>4. Log in as that user<br>5. Verify only permitted modules are accessible |
| **Expected Result** | User's access matches the role's permission set. Restricted pages show access denied. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AD-03 — Override User Permissions
| Field | Details |
|---|---|
| **Day** | 4 |
| **Module** | RBAC |
| **Priority** | Medium |
| **Pre-condition** | User has a base role |
| **Steps** | 1. Edit user permissions<br>2. Grant a specific permission not in their role<br>3. Save<br>4. Log in as the user<br>5. Verify the additional permission is active |
| **Expected Result** | Permission override works. User has both role-based and additional permissions. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AD-04 — Remove User Lockout
| Field | Details |
|---|---|
| **Day** | 4 |
| **Module** | User Management |
| **Priority** | Medium |
| **Pre-condition** | User is locked out due to failed login attempts |
| **Steps** | 1. Go to Users page<br>2. Find locked-out user<br>3. Click "Remove Lockout"<br>4. User tries logging in again |
| **Expected Result** | Lockout removed. User can log in successfully. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AD-05 — Change Asset ID Format Settings
| Field | Details |
|---|---|
| **Day** | 4 |
| **Module** | Settings |
| **Priority** | High |
| **Pre-condition** | Logged in as Admin |
| **Steps** | 1. Go to Settings → Asset ID Format<br>2. Change prefix (e.g., from "AST-" to "CMP-")<br>3. Save<br>4. Create a new asset |
| **Expected Result** | New asset uses updated ID format. Existing assets retain their old IDs. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AD-06 — Toggle MFA Globally
| Field | Details |
|---|---|
| **Day** | 4 |
| **Module** | Settings |
| **Priority** | Medium |
| **Pre-condition** | Logged in as Admin |
| **Steps** | 1. Go to Settings → MFA<br>2. Enable "Require MFA for all users"<br>3. Save<br>4. Log in as a different user |
| **Expected Result** | User is prompted to set up MFA (TOTP) on next login. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AD-07 — Configure Security Settings
| Field | Details |
|---|---|
| **Day** | 4 |
| **Module** | Settings |
| **Priority** | Medium |
| **Pre-condition** | Logged in as Admin |
| **Steps** | 1. Go to Settings → Security<br>2. Modify password policy (min length, complexity)<br>3. Set session timeout<br>4. Configure account lockout threshold<br>5. Save |
| **Expected Result** | Settings saved. Password policy enforced on next password change. Session times out after configured period. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AD-08 — View Dashboard with Charts
| Field | Details |
|---|---|
| **Day** | 4 |
| **Module** | Dashboard |
| **Priority** | High |
| **Pre-condition** | Sufficient asset data exists |
| **Steps** | 1. Go to Dashboard<br>2. Verify all chart widgets load<br>3. Hover over chart elements for tooltips<br>4. Check distribution by type, category, department, location |
| **Expected Result** | Dashboard loads with all charts. Data matches actual asset records. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AD-09 — Generate Maintenance / Repair Report
| Field | Details |
|---|---|
| **Day** | 4 |
| **Module** | Reports |
| **Priority** | Medium |
| **Pre-condition** | Assets with maintenance/repair history exist |
| **Steps** | 1. Go to Reports<br>2. Select Maintenance History report<br>3. Set date range and asset filter<br>4. Generate report<br>5. Export to PDF/Excel |
| **Expected Result** | Report displays with correct data. Export downloads successfully. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AD-10 — Generate Finance Report
| Field | Details |
|---|---|
| **Day** | 4 |
| **Module** | Reports |
| **Priority** | Medium |
| **Pre-condition** | Assets with depreciation values exist |
| **Steps** | 1. Go to Reports<br>2. Select Finance Report<br>3. Select depreciation period or date range<br>4. Generate report |
| **Expected Result** | Financial data (asset value, depreciation, current value) calculated and displayed correctly. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AD-11 — View Audit Trail
| Field | Details |
|---|---|
| **Day** | 4 |
| **Module** | Audit |
| **Priority** | Medium |
| **Pre-condition** | Asset activity has occurred (creates, edits, assignments) |
| **Steps** | 1. Go to Audit Trail<br>2. Browse all audit entries<br>3. Filter by action type, user, date<br>4. Click on an entry for details |
| **Expected Result** | All actions (create, update, assign, return, etc.) logged with timestamps and user info. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AD-12 — Verify Audit Hash Chain
| Field | Details |
|---|---|
| **Day** | 4 |
| **Module** | Audit |
| **Priority** | Medium |
| **Pre-condition** | Audit entries exist with hash chain |
| **Steps** | 1. Open Audit Trail<br>2. Click "Verify Integrity" or similar option<br>3. Verify hash chain validation |
| **Expected Result** | Hash chain validation passes. Tamper detection confirms data integrity. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AD-13 — Intangible Asset CRUD
| Field | Details |
|---|---|
| **Day** | 4 |
| **Module** | Intangible Assets |
| **Priority** | Medium |
| **Pre-condition** | Logged in as Asset Administrator |
| **Steps** | 1. Navigate to Intangible Assets section<br>2. Create a software license asset<br>3. Fill license key, expiry date, seats<br>4. Edit the asset<br>5. Delete the asset |
| **Expected Result** | Intangible asset created, editable, and deletable. Separate from physical assets. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-AD-14 — Asset Builder (Composite Assets)
| Field | Details |
|---|---|
| **Day** | 4 |
| **Module** | Asset Builder |
| **Priority** | Medium |
| **Pre-condition** | Multiple component assets exist |
| **Steps** | 1. Go to Asset Builder<br>2. Create a new composite asset<br>3. Add component assets (child assets)<br>4. Save<br>5. View composite asset details |
| **Expected Result** | Composite asset created with linked component assets. Components listed in detail view. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

## Day 5 — Friday, July 17: Barcode/QR, Gate Pass & Sign-off

### TC-BQ-01 — Generate QR Code Tag
| Field | Details |
|---|---|
| **Day** | 5 |
| **Module** | Asset Tagging |
| **Priority** | High |
| **Pre-condition** | Assets exist in the system |
| **Steps** | 1. Go to Asset Tagging page<br>2. Select one or more assets<br>3. Ensure QR toggle is selected<br>4. Generate tag preview<br>5. Print / download PDF |
| **Expected Result** | Tag preview shows company name, logo, and QR code. PDF prints with QR code at high resolution. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-BQ-02 — Scan QR Code with Phone
| Field | Details |
|---|---|
| **Day** | 5 |
| **Module** | Asset Tagging |
| **Priority** | High |
| **Pre-condition** | Printed QR tag exists |
| **Steps** | 1. Open phone camera or QR scanner app<br>2. Scan the printed QR code |
| **Expected Result** | Phone opens the public asset detail page `/assets/details/<code>` showing asset info. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-BQ-03 — Generate Barcode Tag (CODE128)
| Field | Details |
|---|---|
| **Day** | 5 |
| **Module** | Asset Tagging |
| **Priority** | High |
| **Pre-condition** | Assets exist |
| **Steps** | 1. Go to Asset Tagging page<br>2. Select assets<br>3. Toggle to Barcode mode<br>4. Select format: CODE128<br>5. Generate tag preview<br>6. Print / download PDF |
| **Expected Result** | Tag preview shows company name and CODE128 barcode. Barcode encodes the asset code (e.g., AST-001). |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-BQ-04 — Generate Barcode Tag (CODE39)
| Field | Details |
|---|---|
| **Day** | 5 |
| **Module** | Asset Tagging |
| **Priority** | Medium |
| **Pre-condition** | Assets exist |
| **Steps** | 1. Go to Asset Tagging page<br>2. Select assets<br>3. Toggle to Barcode mode<br>4. Select format: CODE39<br>5. Generate tag preview |
| **Expected Result** | Tag preview shows CODE39 barcode encoding the asset code. Different visual width vs CODE128. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-BQ-05 — Scan Barcode with Physical Scanner
| Field | Details |
|---|---|
| **Day** | 5 |
| **Module** | Asset Tagging |
| **Priority** | High |
| **Pre-condition** | Printed barcode tag exists. USB barcode scanner connected. |
| **Steps** | 1. Have the Asset List page open and focused<br>2. Scan the printed barcode with the physical scanner<br>3. Observe system response |
| **Expected Result** | AssetViewModal opens automatically showing the correct asset. Asset code matches. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-BQ-06 — Scan Barcode on My Assets Page
| Field | Details |
|---|---|
| **Day** | 5 |
| **Module** | Scanner Integration |
| **Priority** | Medium |
| **Pre-condition** | Barcode scanner connected. Logged in as user with assigned assets. |
| **Steps** | 1. Go to My Assets page<br>2. Scan a barcode of an assigned asset |
| **Expected Result** | AssetViewModal opens with correct asset. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-BQ-07 — Scan Barcode on Tagging Page
| Field | Details |
|---|---|
| **Day** | 5 |
| **Module** | Scanner Integration |
| **Priority** | Medium |
| **Pre-condition** | Barcode scanner connected. On Asset Tagging page. |
| **Steps** | 1. Go to Asset Tagging page<br>2. Scan a barcode |
| **Expected Result** | AssetViewModal opens with correct asset, or asset is selected for tagging. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-GP-01 — Generate Gate Pass for Single Asset
| Field | Details |
|---|---|
| **Day** | 5 |
| **Module** | Gate Pass |
| **Priority** | High |
| **Pre-condition** | Asset exists and is eligible for movement (not disposed, not under repair) |
| **Steps** | 1. Go to Gate Pass page<br>2. Click "New Gate Pass"<br>3. Select a single asset<br>4. Fill purpose of movement, destination, expected return date<br>5. Add remarks / notes<br>6. Generate gate pass |
| **Expected Result** | Gate pass generated with unique reference number. Shows asset details, QR/barcode, movement info, and date. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-GP-02 — Generate Gate Pass for Multiple Assets
| Field | Details |
|---|---|
| **Day** | 5 |
| **Module** | Gate Pass |
| **Priority** | Medium |
| **Pre-condition** | Multiple assets exist and are eligible for movement |
| **Steps** | 1. Go to Gate Pass page<br>2. Click "New Gate Pass"<br>3. Select multiple assets<br>4. Fill purpose, destination, expected return date<br>5. Generate gate pass |
| **Expected Result** | Single gate pass covers all selected assets. All asset details listed in the document. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

### TC-GP-03 — View and Print Gate Pass Document
| Field | Details |
|---|---|
| **Day** | 5 |
| **Module** | Gate Pass |
| **Priority** | Medium |
| **Pre-condition** | Gate pass has been generated |
| **Steps** | 1. Go to Gate Pass list<br>2. Locate the generated gate pass<br>3. Click View to see full details<br>4. Click Print / Download |
| **Expected Result** | Gate pass document opens with complete details. Print/PDF output includes asset list, QR/barcode, signatures, and movement information. |
| **Status** | ☐ ✅ Pass &nbsp;&nbsp; ☐ ❌ Fail &nbsp;&nbsp; ☐ ⚪ N/A |
| **Actual Result** | |
| **Tester** | |
| **Remarks** | |

---

## Summary Sheet

| Day | Date | Total TCs | Passed | Failed | N/A | Tester Signature |
|---|---|---|---|---|---|---|
| 1 | Jul 13 | 13 | | | | |
| 2 | Jul 14 | 12 | | | | |
| 3 | Jul 15 | 9 | | | | |
| 4 | Jul 16 | 14 | | | | |
| 5 | Jul 17 | 10 | | | | |
| **Total** | | **58** | | | | |

---

---

## UAT Sign-off Sheet

### Project Information

| Field | Details |
|---|---|
| **System** | Asset Management System |
| **UAT Period** | July 13–17, 2026 |
| **Location** | On-premises / Local |
| **Facilitator** | Ryan Rey Magdalita |
| **Participating Companies** | CMTH and all subsidiaries |

### UAT Test Summary

| Metric | Count |
|---|---|
| Total Test Cases | 58 |
| Passed | |
| Failed | |
| N/A | |
| Pass Rate | ___ % |

### Known Issues / Exceptions

List any unresolved issues accepted for production deployment:

| # | Issue Description | Severity | Workaround | Accepted By |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

### UAT Acceptance Statement

I/We have participated in the User Acceptance Testing of the **Asset Management System** and have verified the system against the defined test scenarios. I/We confirm that:

1. The core business processes function as expected
2. All critical and high-severity defects have been resolved or have an acceptable workaround
3. The system is ready for production deployment (subject to resolution of items listed above)

☐ **Approved for Production** — No significant issues found
☐ **Approved with Conditions** — Subject to resolution of listed issues
☐ **Not Approved** — Critical issues require re-testing

### Signatures

#### UAT Facilitator

| Name | Signature | Date |
|---|---|---|
| Ryan Rey Magdalita | | |

#### Participant Signatures

| Name | Company | Role | Signature | Date |
|---|---|---|---|---|
| | CMTH | End User | | |
| | CMTH | IT Asset User | | |
| | CMTH | Asset Administrator | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |

#### Approval Sign-off

| Name | Position / Title | Signature | Date |
|---|---|---|---|
| | Project Lead / Stakeholder | | |
| | IT Head / Department Head | | |

---

*Document Version: 1.1 — July 10, 2026*
