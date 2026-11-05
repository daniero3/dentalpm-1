/** Tests sans base de données : node --test scripts/test-dental-record-node.cjs */
const test = require('node:test');
const assert = require('node:assert/strict');
const { NUM_TO_FDI, VALID_FDI, asFDI, rowFDI, parseTeeth, appendProcedure } = require('../utils/dentalRecord');

test('32 positions historiques correspondent à 32 dents permanentes FDI uniques', () => {
  assert.equal(Object.keys(NUM_TO_FDI).length, 32);
  assert.equal(new Set(Object.values(NUM_TO_FDI)).size, 32);
  assert.equal(rowFDI({ tooth_position:'1' }), '18');
  assert.equal(rowFDI({ tooth_position:'8' }), '11');
  assert.equal(rowFDI({ tooth_position:'9' }), '21');
  assert.equal(rowFDI({ tooth_position:'16' }), '28');
  assert.equal(rowFDI({ tooth_position:'17' }), '48');
  assert.equal(rowFDI({ tooth_position:'24' }), '41');
  assert.equal(rowFDI({ tooth_position:'25' }), '31');
  assert.equal(rowFDI({ tooth_position:'32' }), '38');
});

test('la notation FDI directe prime sur une position historique', () => {
  assert.equal(asFDI('11'), '11');
  assert.equal(asFDI('54'), '54');
  assert.equal(rowFDI({ tooth_fdi:'11', tooth_position:'8' }), '11');
  assert.equal(rowFDI({ tooth_position:'11' }), '23');
  assert.equal(asFDI('1'), '18');
  assert.equal(asFDI('99'), null);
  assert.equal(VALID_FDI.size, 52);
});

test('aucune procédure historique n’est perdue lors de la lecture JSON', () => {
  const records = [
    { tooth_position:'11', status:'filled', procedures:[{ procedure_name:'Couronne' }, { procedure_name:'Contrôle' }] },
    { tooth_position:'3', procedures:[{ procedure_name:'Extraction' }] }
  ];
  const back = parseTeeth(JSON.stringify(records));
  assert.deepEqual(back,records);
  assert.equal(back.find(t=>rowFDI(t)==='23').procedures.length,2);
  assert.deepEqual(parseTeeth('JSON non valide'), []);
  assert.deepEqual(parseTeeth(null), []);
});

test('l’ajout d’un acte préserve le statut, les notes et les actes anciens', () => {
  const original = [{ tooth_position:'11', status:'crowned', notes:'Contrôle', procedures:[{procedure_name:'Couronne'}] }];
  const next = appendProcedure(original,'23',{procedure_name:'Contrôle semestriel'});
  assert.equal(next.length,1);
  assert.equal(next[0].status,'crowned');
  assert.equal(next[0].notes,'Contrôle');
  assert.deepEqual(next[0].procedures.map(p=>p.procedure_name),['Couronne','Contrôle semestriel']);
  assert.equal(original[0].procedures.length,1, 'l’archive originale ne doit pas être modifiée');
  const primary = appendProcedure(next,'54',{procedure_name:'Scellement'});
  assert.equal(primary.length,2);
  assert.equal(primary[1].tooth_fdi,'54');
});
