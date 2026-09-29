const fs = require('fs');
const file = 'd:/Programming/Luvira/app/dashboard/admin/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace the grid from 3 to 4
code = code.replace('{/* 3 Pillars Grid */}\n              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">', '{/* 4 Pillars Grid */}\n              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">');

// Replace modest with lux
code = code.replace(/Pilar 1 — Modest/g, 'Pilar 1 — Lux');
code = code.replace(/modest/g, 'lux');

// Replace comfortable with lovable
code = code.replace(/Pilar 2 — Comfortable/g, 'Pilar 2 — Lovable');
code = code.replace(/comfortable/g, 'lovable');

// Replace chic with innovative
code = code.replace(/Pilar 3 — Chic/g, 'Pilar 3 — Innovative');
code = code.replace(/chic/g, 'innovative');

// We need to add radiant (Pillar 4) after innovative.
// Let's find where innovative ends.
const innovativeEndIdx = code.indexOf('</div>', code.indexOf('copyForm.about.pillars.innovative.description'));
const insertPos = code.indexOf('</div>', innovativeEndIdx + 1) + 6;

const radiantBlock = `
                {/* Pillar 4: Radiant */}
                <div className="p-4 bg-warm-cream rounded-2xl border border-deep-forest/10 space-y-2.5">
                  <span className="text-xs font-black text-amber-600 uppercase">
                    Pilar 4 — Radiant
                  </span>
                  <Input
                    label="Judul Pilar"
                    value={copyForm.about.pillars.radiant.title}
                    onChange={(e) =>
                      setCopyForm({
                        ...copyForm,
                        about: {
                          ...copyForm.about,
                          pillars: {
                            ...copyForm.about.pillars,
                            radiant: {
                              ...copyForm.about.pillars.radiant,
                              title: e.target.value,
                            },
                          },
                        },
                      })
                    }
                  />
                  <Input
                    label="Sub-judul Catchphrase"
                    value={copyForm.about.pillars.radiant.subtitle}
                    onChange={(e) =>
                      setCopyForm({
                        ...copyForm,
                        about: {
                          ...copyForm.about,
                          pillars: {
                            ...copyForm.about.pillars,
                            radiant: {
                              ...copyForm.about.pillars.radiant,
                              subtitle: e.target.value,
                            },
                          },
                        },
                      })
                    }
                  />
                  <Textarea
                    label="Penjelasan Narasi"
                    value={copyForm.about.pillars.radiant.description}
                    onChange={(e) =>
                      setCopyForm({
                        ...copyForm,
                        about: {
                          ...copyForm.about,
                          pillars: {
                            ...copyForm.about.pillars,
                            radiant: {
                              ...copyForm.about.pillars.radiant,
                              description: e.target.value,
                            },
                          },
                        },
                      })
                    }
                  />
                </div>
`;

code = code.slice(0, insertPos) + radiantBlock + code.slice(insertPos);

fs.writeFileSync(file, code);
console.log('Fixed admin page.tsx');
