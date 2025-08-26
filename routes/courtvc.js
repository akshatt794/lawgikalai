// routes/courtvc.js
const express = require('express');
const router = express.Router();
const CourtVC = require('../models/CourtVC');
const Joi = require('joi');
const { Parser } = require('json2csv');

const itemSchema = Joi.object({
  name: Joi.string().required(),
  designation: Joi.string().allow('', null),
  jurisdiction: Joi.string().allow('', null),
  courtName: Joi.string().required(),
  courtRoom: Joi.string().allow('', null),
  vcLink: Joi.string().uri().allow('', null),
  vcMeetingId: Joi.string().allow('', null),
  vcEmail: Joi.string().email().allow('', null),
  district: Joi.string().allow('', null),
  zone: Joi.string().allow('', null),
  location: Joi.string().allow('', null),
  source: Joi.object({
    name: Joi.string().allow('', null),
    url: Joi.string().uri().allow('', null),
    capturedAt: Joi.date().optional()
  }).optional()
});

function buildQuery(qs){
  const { q, courtName, courtRoom, name, district, zone, location } = qs;
  const and = [];
  if (q) and.push({ $text: { $search: q } });
  if (courtName) and.push({ courtName: new RegExp(courtName, 'i') });
  if (courtRoom) and.push({ courtRoom: new RegExp(`^${courtRoom}$`, 'i') });
  if (name) and.push({ name: new RegExp(name, 'i') });
  if (district) and.push({ district: new RegExp(district, 'i') });
  if (zone) and.push({ zone: new RegExp(zone, 'i') });
  if (location) and.push({ location: new RegExp(location, 'i') });
  return and.length ? { $and: and } : {};
}

router.get('/', async (req,res)=>{
  const page = Math.max(parseInt(req.query.page)||1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit)||20, 1), 100);
  const sort = req.query.sort || 'name';
  const query = buildQuery(req.query);
  const [items,total] = await Promise.all([
    CourtVC.find(query).sort(sort).skip((page-1)*limit).limit(limit).lean(),
    CourtVC.countDocuments(query)
  ]);
  res.json({ ok:true, page, limit, total, results: items });
});

router.get('/:id', async (req,res)=>{
  const item = await CourtVC.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ ok:false, error:'Not found' });
  res.json({ ok:true, result: item });
});

router.post('/', async (req,res)=>{
  const { value, error } = itemSchema.validate(req.body, { stripUnknown:true });
  if (error) return res.status(400).json({ ok:false, error: error.message });
  try{
    const created = await CourtVC.findOneAndUpdate(
      { name:value.name, courtName:value.courtName, courtRoom:value.courtRoom, vcLink:value.vcLink },
      { $set:value },
      { upsert:true, new:true, setDefaultsOnInsert:true }
    );
    res.status(201).json({ ok:true, result: created });
  }catch(e){
    if (e.code===11000) return res.status(409).json({ ok:false, error:'Duplicate record' });
    res.status(500).json({ ok:false, error:'Server error' });
  }
});

router.put('/:id', async (req,res)=>{
  const { value, error } = itemSchema.validate(req.body, { stripUnknown:true });
  if (error) return res.status(400).json({ ok:false, error: error.message });
  const updated = await CourtVC.findByIdAndUpdate(req.params.id, { $set:value }, { new:true });
  if (!updated) return res.status(404).json({ ok:false, error:'Not found' });
  res.json({ ok:true, result: updated });
});

router.delete('/:id', async (req,res)=>{
  const deleted = await CourtVC.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ ok:false, error:'Not found' });
  res.json({ ok:true, result: deleted._id });
});

router.post('/bulk', async (req,res)=>{
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ ok:false, error:'items[] required' });
  const results = [];
  for (const raw of items){
    const { value, error } = itemSchema.validate(raw, { stripUnknown:true });
    if (error) return res.status(400).json({ ok:false, error: error.message });
    const doc = await CourtVC.findOneAndUpdate(
      { name:value.name, courtName:value.courtName, courtRoom:value.courtRoom, vcLink:value.vcLink },
      { $set:value },
      { upsert:true, new:true, setDefaultsOnInsert:true }
    );
    results.push(doc);
  }
  res.status(201).json({ ok:true, inserted: results.length, results });
});

router.get('/export.csv', async (req,res)=>{
  const rows = await CourtVC.find(buildQuery(req.query)).sort('name').lean();
  const fields = ['name','designation','jurisdiction','courtName','courtRoom','vcLink','vcMeetingId','vcEmail','district','zone','location','createdAt','updatedAt'];
  const parser = new Parser({ fields });
  const csv = parser.parse(rows);
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.setHeader('Content-Disposition','attachment; filename="court-vc.csv"');
  res.send(csv);
});

module.exports = router;
