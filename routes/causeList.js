// routes/causeList.js
const express = require('express');
const router = express.Router();

/**
 * GET /api/courts/cause-list
 * Static response: "Cause list fetched successfully" + grouped courts
 * Top: Delhi High Court
 * Under it: Delhi District Courts
 */
router.get('/cause-list', (req, res) => {
  const response = {
    message: 'Cause list fetched successfully',
    data: {
      high_court: [
        {
          court_id: 'DHC-001',
          court_name: 'Delhi High Court',
          link: 'https://delhihighcourt.nic.in/app/online-causelist'
        }
      ],
      delhi_district_courts: [
        {
          court_id: 'DDC-101',
          court_name: 'South East Delhi District Court',
          link: 'https://southeastdelhi.dcourts.gov.in/cause-list-%e2%81%84-daily-board/'
        },
        {
          court_id: 'DDC-102',
          court_name: 'South West Delhi District Court',
          link: 'https://southwestdelhi.dcourts.gov.in/cause-list-%e2%81%84-daily-board/'
        },
        {
          court_id: 'DDC-103',
          court_name: 'South Delhi District Court',
          link: 'https://southdelhi.dcourts.gov.in/cause-list-%e2%81%84-daily-board/'
        },
        {
          court_id: 'DDC-104',
          court_name: 'New Delhi District Court',
          link: 'https://newdelhi.dcourts.gov.in/cause-list-%e2%81%84-daily-board/'
        },
        {
          court_id: 'DDC-105',
          court_name: 'Central Delhi District Court',
          link: 'https://centraldelhi.dcourts.gov.in/cause-list-%e2%81%84-daily-board/'
        },
        {
          court_id: 'DDC-106',
          court_name: 'West Delhi District Court',
          link: 'https://westdelhi.dcourts.gov.in/cause-list-%e2%81%84-daily-board/'
        },
        {
          court_id: 'DDC-107',
          court_name: 'East Delhi District Court',
          link: 'https://eastdelhi.dcourts.gov.in/cause-list-%e2%81%84-daily-board/'
        },
        {
          court_id: 'DDC-108',
          court_name: 'North East Delhi District Court',
          link: 'https://northeast.dcourts.gov.in/cause-list-%e2%81%84-daily-board/'
        },
        {
          court_id: 'DDC-109',
          court_name: 'Shahdara District Court',
          link: 'https://shahdara.dcourts.gov.in/cause-list-%e2%81%84-daily-board/'
        },
        {
          court_id: 'DDC-110',
          court_name: 'Rohini Courts (North West Delhi)',
          link: 'https://rohini.dcourts.gov.in/cause-list-%e2%81%84-daily-board/'
        },
        {
          court_id: 'DDC-111',
          court_name: 'North Delhi District Court',
          link: 'https://northdelhi.dcourts.gov.in/cause-list-%e2%81%84-daily-board/'
        }
      ]
    }
  };

  res.json(response);
});

module.exports = router;
