const fs = require('fs');
const file = 'client/src/pages/CheckInPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update FamilyMember
content = content.replace(
  '  relationship?: string;\n}',
  '  relationship?: string;\n  customPrice?: number;\n}'
);

// 2. Remove states and upload handler
content = content.replace(/  const \[passportImage.*?setIsUploadingZaks\(false\);\n    }\n  };\n/s, '');

// 3. Update calculatedTotal logic
const calcRegex = /  \/\/ Hisoblab chiqarilgan narx\n  const calculatedTotal = effectivePricePerPerson \* numberOfPeople \* nights;\n\n  \/\/ Agar kelishilgan narx bo'lsa, uni ishlatamiz\n  const totalPrice = useNegotiated && negotiatedPrice\n    \? Number\(negotiatedPrice\)\n    : calculatedTotal;/;

const newCalc = `  const getMemberPrice = (member: FamilyMember, basePrice: number) => {
    if (member.customPrice !== undefined) return member.customPrice;
    const age = new Date().getFullYear() - member.birthYear;
    if (age <= 3) return 0;
    if (age >= 4 && age <= 6) return 65000;
    if (age >= 7 && age <= 13) return 140000;
    return basePrice;
  };

  const mainGuestPrice = effectivePricePerPerson;
  const membersTotal = familyMembers.reduce((sum, m) => sum + getMemberPrice(m, effectivePricePerPerson), 0);
  const calculatedTotal = (mainGuestPrice + membersTotal) * nights;

  const totalPrice = useNegotiated && negotiatedPrice
    ? Number(negotiatedPrice)
    : calculatedTotal;`;
content = content.replace(calcRegex, newCalc);

// 4. Update payload
content = content.replace(/passportImage,\n        spouseDetails.*?zaksImage\n        } : undefined/s, "spouseDetails: data.maritalStatus === 'married' ? { fullName: data.spouseName } : undefined");
content = content.replace(/negotiatedPrice: useNegotiated && negotiatedPrice \? Number\(negotiatedPrice\) : undefined/s, 'negotiatedPrice: useNegotiated && negotiatedPrice ? Number(negotiatedPrice) : calculatedTotal');

// 5. Remove Passport UI
content = content.replace(/            <div className="space-y-2 md:col-span-2">\n              <Label className="text-zinc-700 dark:text-zinc-300">Pasport Rasmi.*?<\/div>\n            <\/div>/s, '');

// 6. Remove Zaks UI
content = content.replace(/                <div className="space-y-2">\n                  <Label className="text-zinc-700 dark:text-zinc-300">Zaks guvohnomasi.*?<\/div>\n              \)}/s, '');

// 7. Update Family Member Grid
const gridRegex = /<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">.*?<\/div>\n                  <\/div>/s;
const newGrid = `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1 lg:col-span-1">
                      <Label className="text-xs text-zinc-600 dark:text-zinc-400">To'liq ismi</Label>
                      <Input
                        value={member.fullName}
                        onChange={(e) => updateFamilyMember(index, 'fullName', e.target.value)}
                        placeholder="Ism Familiya"
                        className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-600 dark:text-zinc-400">Tug'ilgan yili</Label>
                      <Input
                        type="number"
                        value={member.birthYear}
                        onChange={(e) => updateFamilyMember(index, 'birthYear', Number(e.target.value))}
                        placeholder="2000"
                        min={1900}
                        max={new Date().getFullYear()}
                        className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-600 dark:text-zinc-400">Jinsi</Label>
                      <Select
                        value={member.gender}
                        onValueChange={(v) => updateFamilyMember(index, 'gender', v as any)}
                      >
                        <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                          <SelectItem value="male">Erkak</SelectItem>
                          <SelectItem value="female">Ayol</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-600 dark:text-zinc-400">Narx (UZS)</Label>
                      <Select
                        value={String(getMemberPrice(member, effectivePricePerPerson))}
                        onValueChange={(v) => updateFamilyMember(index, 'customPrice', Number(v))}
                      >
                        <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                          <SelectItem value="0">0 (0-3 yosh)</SelectItem>
                          <SelectItem value="65000">65,000 (4-6 yosh)</SelectItem>
                          <SelectItem value="140000">140,000 (7-13 yosh)</SelectItem>
                          <SelectItem value="160000">160,000 (7-13 yosh)</SelectItem>
                          <SelectItem value="250000">250,000 (7-13 yosh)</SelectItem>
                          <SelectItem value={String(effectivePricePerPerson)}>Kattalar narxi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>`;
content = content.replace(gridRegex, newGrid);

// 8. Update members list summary in calculation block
content = content.replace(
  /<span>{effectivePricePerPerson.toLocaleString\(\)} UZS\/kecha<\/span>/g,
  '<span>{getMemberPrice(m, effectivePricePerPerson).toLocaleString()} UZS/kecha</span>'
);
// Fix the main guest summary
content = content.replace(
  /<span>1\. Asosiy mehmon \(siz\)<\/span>\n                    <span>\{getMemberPrice\(m, effectivePricePerPerson\)\.toLocaleString\(\)\} UZS\/kecha<\/span>/,
  '<span>1. Asosiy mehmon (siz)</span>\n                    <span>{effectivePricePerPerson.toLocaleString()} UZS/kecha</span>'
);

// Form schema hasZaks defaults removal
content = content.replace(/hasZaks: z.boolean\(\).optional\(\),/, '');
content = content.replace(/hasZaks: false,/, '');

fs.writeFileSync(file, content);
console.log('Update Complete');
