import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, FunnelSimple, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { ResponsiveDialog } from '../ResponsiveDialog';
import { useInstallationGroupCategorySettings, useInstallationGroups } from '../../hooks/use-data';
import {
  InstallationGroup,
  InstallationGroupCategoryPreference,
  InstallationGroupCategorySettings,
  InstallationGroupIndustryPreset,
} from '../../lib/types';
import { formatCurrency } from '../../lib/calculations';
import { ReadOnlyAlert } from '../ReadOnlyAlert';
import FieldHelpLabel from '../FieldHelpLabel';
import { Alert, AlertDescription } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from '../../hooks/use-auth';

const UNCATEGORIZED_CATEGORY = 'Ilman kategoriaa';

const INDUSTRY_PRESETS: Array<{
  value: InstallationGroupIndustryPreset;
  label: string;
  description: string;
  categories: string[];
}> = [
  {
    value: 'construction',
    label: 'Rakennus / remontti',
    description: 'Purku, pintatyöt, kalusteet ja viimeistely samaan näkymään.',
    categories: ['Purku', 'Laatoitus', 'Maalaus', 'Kalusteasennus', 'Viimeistely'],
  },
  {
    value: 'electrical',
    label: 'Sähkö',
    description: 'Kaapelointi, keskukset, valaisimet ja vikakorjaukset.',
    categories: ['Kaapelointi', 'Keskukset', 'Valaisimet', 'Kytkimet', 'Vikakorjaukset'],
  },
  {
    value: 'plumbing',
    label: 'LVI',
    description: 'Putket, liittimet, hanat, kalusteet ja huoltotyöt.',
    categories: ['Putket', 'Liittimet', 'Hanat', 'Kalusteet', 'Huolto'],
  },
  {
    value: 'furniture',
    label: 'Kaluste / sisustus',
    description: 'Kalusteasennukset, pintamateriaalit ja viimeistely omalla logiikalla.',
    categories: ['Kalusteasennus', 'Pintamateriaalit', 'Varusteet', 'Toimitus', 'Viimeistely'],
  },
  {
    value: 'general',
    label: 'Yleinen',
    description: 'Yleiskäyttöinen pohja tuotteille, työlle, asennukselle ja huollolle.',
    categories: ['Tuotteet', 'Työ', 'Asennus', 'Huolto', 'Muut'],
  },
  {
    value: 'custom',
    label: 'Oma tyhjä pohja',
    description: 'Aloita ilman valmiita kategorioita ja rakenna näkymä itse.',
    categories: [],
  },
];

const EMPTY_FORM = {
  name: '',
  category: '',
  description: '',
  defaultPrice: 0,
  defaultMarginPercent: 0,
  defaultInstallationPrice: 0,
};

const GROUP_FIELD_HELP = {
  name: 'Hintaryhmän nimi kertoo, mihin töihin tai tuotteisiin tätä oletusta käytetään. Valitse nimi, jonka henkilöstö tunnistaa nopeasti.',
  category: 'Kategoria ohjaa sitä, missä suodatuksessa hintaryhmä näkyy. Voit käyttää valmista toimialapohjaa tai kirjoittaa oman kategorian.',
  description: 'Kuvaus on sisäinen selvennys siitä, mihin tilanteisiin tai tuoteluokkaan hintaryhmä on tarkoitettu.',
  defaultPrice: 'Oletushinta on ryhmän perushinta, jota voidaan käyttää tuotteilla tai asennuksissa valmiina lähtöarvona.',
  defaultMarginPercent: 'Oletuskate määrittää suositellun katetason tälle ryhmälle, jos tuotekohtaista katetta ei ole annettu erikseen.',
  defaultInstallationPrice: 'Oletusasennus tuo valmiin asennushinnan tuotteille, joille tämä hintaryhmä on valittu.',
} as const;

const CATEGORY_NAME_PLACEHOLDERS: Record<string, string> = {
  [UNCATEGORIZED_CATEGORY]: 'Esim. Perustyö',
  purku: 'Esim. Purkutyö',
  laatoitus: 'Esim. Laatoitustyö',
  maalaus: 'Esim. Maalaustyö',
  kalusteasennus: 'Esim. Kalusteasennus',
  viimeistely: 'Esim. Viimeistelytyö',
  tuotteet: 'Esim. Vakiotuotteet',
  työ: 'Esim. Asennustyö',
  asennus: 'Esim. Perusasennus',
  huolto: 'Esim. Huoltotyö',
  muut: 'Esim. Erikoistyö',
  kaapelointi: 'Esim. Kaapelointityö',
  keskukset: 'Esim. Keskusasennus',
  valaisimet: 'Esim. Valaisinasennus',
  kytkimet: 'Esim. Kytkinasennus',
  vikakorjaukset: 'Esim. Vikakorjaus',
  putket: 'Esim. Putkityö',
  liittimet: 'Esim. Liitintyö',
  hanat: 'Esim. Hana-asennus',
  kalusteet: 'Esim. Kalusteiden asennus',
  pintamateriaalit: 'Esim. Pintamateriaalit',
  varusteet: 'Esim. Varusteasennus',
  toimitus: 'Esim. Toimitus ja nosto',
};

function getGroupNamePlaceholder(category?: string) {
  const normalized = normalizeCategory(category).toLowerCase();
  return CATEGORY_NAME_PLACEHOLDERS[normalized] ?? 'Esim. Työvaiheen oletushinta';
}

function getGroupDescriptionPlaceholder(category?: string) {
  const normalized = normalizeCategory(category);
  if (normalized === UNCATEGORIZED_CATEGORY) {
    return 'Esim. Käytetään yleisiin töihin tai tuotteisiin, joille ei ole omaa ryhmää.';
  }
  return `Esim. Käytetään ${normalized.toLowerCase()}-töihin tai vastaaviin tuotteisiin.`;
}

function normalizeCategory(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : UNCATEGORIZED_CATEGORY;
}

function getPresetMeta(preset?: InstallationGroupIndustryPreset) {
  return INDUSTRY_PRESETS.find((item) => item.value === preset);
}

function buildPreferenceMap(preferences: InstallationGroupCategoryPreference[]) {
  return new Map(preferences.map((preference) => [preference.name, preference]));
}

export default function InstallationGroupsPage() {
  const { groups, addGroup, updateGroup, deleteGroup } = useInstallationGroups();
  const { settings: categorySettings, updateSettings: updateCategorySettings } =
    useInstallationGroupCategorySettings();
  const { canManageSharedData } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<InstallationGroup | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);

  const presetMeta = useMemo(
    () => getPresetMeta(categorySettings.industryPreset),
    [categorySettings.industryPreset]
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    groups.forEach((group) => {
      const key = normalizeCategory(group.category);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [groups]);

  const categoryItems = useMemo(() => {
    const presetCategories = presetMeta?.categories ?? [];
    const dynamicCategories = groups.map((group) => normalizeCategory(group.category));
    const preferenceNames = categorySettings.preferences.map((preference) => preference.name);
    const allNames = Array.from(
      new Set([...presetCategories, ...preferenceNames, ...dynamicCategories])
    );
    const preferenceMap = buildPreferenceMap(categorySettings.preferences);
    const presetOrder = new Map(presetCategories.map((name, index) => [name, index]));

    return allNames
      .map((name) => {
        const preference = preferenceMap.get(name);
        const count = categoryCounts.get(name) ?? 0;
        const fallbackOrder = presetOrder.has(name)
          ? presetOrder.get(name)!
          : 1000 + allNames.findIndex((item) => item === name);

        return {
          name,
          count,
          visible: preference?.visible ?? true,
          favorite: preference?.favorite ?? false,
          sortOrder: preference?.sortOrder ?? fallbackOrder,
          isPresetCategory: presetCategories.includes(name),
          isDynamicCategory: count > 0,
        };
      })
      .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'fi'));
  }, [categoryCounts, categorySettings.preferences, groups, presetMeta]);

  const visibleCategoryItems = useMemo(
    () =>
      categoryItems.filter((item) => {
        if (!item.visible) return false;
        if (categorySettings.showFavoritesOnly && !item.favorite) return false;
        if (categorySettings.hideEmptyCategories && item.count === 0) return false;
        return true;
      }),
    [categoryItems, categorySettings.hideEmptyCategories, categorySettings.showFavoritesOnly]
  );

  useEffect(() => {
    if (selectedCategory && !visibleCategoryItems.some((item) => item.name === selectedCategory)) {
      setSelectedCategory(null);
    }
  }, [selectedCategory, visibleCategoryItems]);

  const filteredGroups = useMemo(() => {
    if (!selectedCategory) {
      return groups;
    }
    return groups.filter((group) => normalizeCategory(group.category) === selectedCategory);
  }, [groups, selectedCategory]);

  const editableCategories = useMemo(
    () => categoryItems.filter((item) => item.name !== UNCATEGORIZED_CATEGORY).map((item) => item.name),
    [categoryItems]
  );

  const hasCategoryConfiguration =
    Boolean(categorySettings.industryPreset) || categorySettings.preferences.length > 0;

  const openDialog = (group?: InstallationGroup) => {
    if (!canManageSharedData) {
      toast.error('Vain admin voi lisätä ja muokata hintaryhmiä.');
      return;
    }

    setEditingGroup(group ?? null);
    setFormData(
      group
        ? {
            name: group.name,
            category: group.category ?? selectedCategory ?? '',
            description: group.description ?? '',
            defaultPrice: group.defaultPrice,
            defaultMarginPercent: group.defaultMarginPercent ?? 0,
            defaultInstallationPrice: group.defaultInstallationPrice ?? 0,
          }
        : {
            ...EMPTY_FORM,
            category:
              selectedCategory && selectedCategory !== UNCATEGORIZED_CATEGORY
                ? selectedCategory
                : '',
          }
    );
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Anna hintaryhmälle nimi.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      category: formData.category.trim() || undefined,
      description: formData.description.trim() || undefined,
      defaultPrice: formData.defaultPrice,
      defaultMarginPercent: formData.defaultMarginPercent,
      defaultInstallationPrice: formData.defaultInstallationPrice,
    };

    try {
      if (editingGroup) {
        updateGroup(editingGroup.id, payload);
        toast.success('Hintaryhmä päivitetty.');
      } else {
        addGroup(payload);
        toast.success('Hintaryhmä lisätty.');
      }

      setDialogOpen(false);
      setEditingGroup(null);
      setFormData(EMPTY_FORM);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Tallennus epäonnistui.');
    }
  };

  const handleDelete = (group: InstallationGroup) => {
    if (!confirm(`Poistetaanko hintaryhmä "${group.name}"?`)) {
      return;
    }

    try {
      deleteGroup(group.id);
      toast.success('Hintaryhmä poistettu.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Poisto epäonnistui.');
    }
  };

  const upsertCategoryPreference = (
    name: string,
    updates: Partial<InstallationGroupCategoryPreference>
  ) => {
    const targetName = name.trim();
    if (!targetName) {
      return;
    }

    updateCategorySettings((currentSettings: InstallationGroupCategorySettings) => {
      const existingIndex = currentSettings.preferences.findIndex(
        (preference) => preference.name === targetName
      );
      const existing = existingIndex >= 0 ? currentSettings.preferences[existingIndex] : undefined;
      const fallbackSortOrder =
        categoryItems.find((item) => item.name === targetName)?.sortOrder ??
        (currentSettings.preferences.length
          ? Math.max(...currentSettings.preferences.map((preference) => preference.sortOrder)) + 1
          : 0);

      const nextPreference: InstallationGroupCategoryPreference = {
        name: targetName,
        visible: existing?.visible ?? true,
        favorite: existing?.favorite ?? false,
        sortOrder: existing?.sortOrder ?? fallbackSortOrder,
        ...updates,
      };

      const nextPreferences = [...currentSettings.preferences];
      if (existingIndex >= 0) {
        nextPreferences[existingIndex] = nextPreference;
      } else {
        nextPreferences.push(nextPreference);
      }

      return {
        ...currentSettings,
        preferences: nextPreferences,
      };
    });
  };

  const moveCategory = (name: string, direction: -1 | 1) => {
    const currentIndex = categoryItems.findIndex((item) => item.name === name);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= categoryItems.length) {
      return;
    }

    const sourceItem = categoryItems[currentIndex];
    const targetItem = categoryItems[targetIndex];

    updateCategorySettings((currentSettings: InstallationGroupCategorySettings) => {
      const nextPreferences = [...currentSettings.preferences];

      const ensurePreference = (itemName: string, sortOrder: number) => {
        const existingIndex = nextPreferences.findIndex((preference) => preference.name === itemName);
        const existing =
          existingIndex >= 0
            ? nextPreferences[existingIndex]
            : {
                name: itemName,
                visible: true,
                favorite: false,
                sortOrder,
              };

        if (existingIndex >= 0) {
          return { index: existingIndex, preference: existing };
        }

        nextPreferences.push(existing);
        return { index: nextPreferences.length - 1, preference: existing };
      };

      const sourcePreference = ensurePreference(sourceItem.name, sourceItem.sortOrder);
      const targetPreference = ensurePreference(targetItem.name, targetItem.sortOrder);

      nextPreferences[sourcePreference.index] = {
        ...sourcePreference.preference,
        sortOrder: targetItem.sortOrder,
      };
      nextPreferences[targetPreference.index] = {
        ...targetPreference.preference,
        sortOrder: sourceItem.sortOrder,
      };

      return {
        ...currentSettings,
        preferences: nextPreferences,
      };
    });
  };

  const handleAddCustomCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      toast.error('Anna uudelle kategorialle nimi.');
      return;
    }
    if (categoryItems.some((item) => item.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error('Kategoria on jo olemassa.');
      return;
    }

    upsertCategoryPreference(trimmedName, {
      visible: true,
      favorite: false,
      sortOrder:
        categoryItems.length > 0
          ? Math.max(...categoryItems.map((item) => item.sortOrder)) + 1
          : 0,
    });
    setNewCategoryName('');
    toast.success('Oma kategoria lisätty.');
  };

  const handleRemoveCategoryFromView = (name: string) => {
    if (categoryCounts.get(name)) {
      toast.error('Kategoria on käytössä hintaryhmissä. Piilota se tarvittaessa näkymästä.');
      return;
    }

    updateCategorySettings((currentSettings: InstallationGroupCategorySettings) => ({
      ...currentSettings,
      preferences: currentSettings.preferences.filter((preference) => preference.name !== name),
    }));
  };

  const applyIndustryPreset = (preset: InstallationGroupIndustryPreset) => {
    const nextPreset = getPresetMeta(preset);

    updateCategorySettings((currentSettings: InstallationGroupCategorySettings) => {
      if (preset === 'custom') {
        return {
          ...currentSettings,
          industryPreset: preset,
        };
      }

      const currentMap = buildPreferenceMap(currentSettings.preferences);
      const reorderedPresetPreferences = nextPreset!.categories.map((name, index) => ({
        name,
        visible: currentMap.get(name)?.visible ?? true,
        favorite: currentMap.get(name)?.favorite ?? false,
        sortOrder: index,
      }));

      const leftoverPreferences = currentSettings.preferences
        .filter((preference) => !nextPreset!.categories.includes(preference.name))
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((preference, index) => ({
          ...preference,
          sortOrder: reorderedPresetPreferences.length + index,
        }));

      return {
        ...currentSettings,
        industryPreset: preset,
        preferences: [...reorderedPresetPreferences, ...leftoverPreferences],
      };
    });

    toast.success(`Toimialapohja vaihdettu: ${nextPreset?.label ?? 'Oma tyhjä pohja'}.`);
  };

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Hintaryhmät</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Määritä oletuskatteet, hinnat ja asennuskulut tuoteryhmittäin. Näkymä voidaan sovittaa toimialan ja käyttäjän oman työnkulun mukaan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setSettingsDialogOpen(true)} className="gap-2">
            <FunnelSimple weight="bold" />
            Muokkaa näkyviä kategorioita
          </Button>
          <Button onClick={() => openDialog()} className="gap-2" disabled={!canManageSharedData}>
            <Plus weight="bold" />
            Lisää hintaryhmä
          </Button>
        </div>
      </div>

      <Alert>
        <AlertDescription>
          Hintaryhmien kategoriat eivät ole enää lukittu valmislista. Voit valita toimialapohjan, näyttää vain haluamasi kategoriat ja pitää näkymän siistinä myös silloin, kun yrityksen toimiala muuttuu tai laajenee.
        </AlertDescription>
      </Alert>

      {!hasCategoryConfiguration && (
        <Card className="p-6">
          <div className="max-w-3xl space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Valitse lähtöpohja hintaryhmille</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Ensimmäisellä käyttökerralla voit ottaa valmiin toimialapohjan tai aloittaa tyhjästä. Pohja vaikuttaa vain siihen, mitä kategorioita sinulle näytetään yläpinnan suodattimissa.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {INDUSTRY_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-primary/40 hover:shadow-sm"
                  onClick={() => applyIndustryPreset(preset.value)}
                  type="button"
                >
                  <div className="text-sm font-semibold text-slate-950">{preset.label}</div>
                  <div className="mt-2 text-sm leading-6 text-muted-foreground">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {!canManageSharedData && <ReadOnlyAlert />}

      <div className="flex flex-wrap items-center gap-2">
        <FunnelSimple className="h-4 w-4 text-muted-foreground" />
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className="gap-2"
        >
          Kaikki
          <Badge variant="secondary">{groups.length}</Badge>
        </Button>
        {visibleCategoryItems.map((category) => (
          <Button
            key={category.name}
            variant={selectedCategory === category.name ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category.name)}
            className="gap-2"
          >
            <span>{category.name}</span>
            {category.favorite && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                Suosikki
              </span>
            )}
            <Badge variant="secondary">{category.count}</Badge>
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {presetMeta && (
          <Badge variant="outline" className="rounded-full px-3 py-1">
            Toimialapohja: {presetMeta.label}
          </Badge>
        )}
        {categorySettings.hideEmptyCategories && (
          <Badge variant="outline" className="rounded-full px-3 py-1">
            Tyhjät piilotettu
          </Badge>
        )}
        {categorySettings.showFavoritesOnly && (
          <Badge variant="outline" className="rounded-full px-3 py-1">
            Vain suosikit
          </Badge>
        )}
      </div>

      <Card className="p-6">
        {filteredGroups.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {selectedCategory
              ? `Ei hintaryhmiä kategoriassa "${selectedCategory}".`
              : 'Ei hintaryhmiä. Lisää ensimmäinen hintaryhmä tai rajaa näkyvät kategoriat omalle toimialallesi sopiviksi.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ryhmän nimi</TableHead>
                <TableHead>Kategoria</TableHead>
                <TableHead>Kuvaus</TableHead>
                <TableHead className="text-right">Oletushinta</TableHead>
                <TableHead className="text-right">Oletuskate</TableHead>
                <TableHead className="text-right">Oletusasennus</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>{normalizeCategory(group.category)}</TableCell>
                  <TableCell className="text-muted-foreground">{group.description || '-'}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(group.defaultPrice)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {(group.defaultMarginPercent ?? 0).toFixed(1)} %
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(group.defaultInstallationPrice ?? 0)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openDialog(group)}
                        disabled={!canManageSharedData}
                      >
                        <PencilSimple />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleDelete(group)}
                        disabled={!canManageSharedData}
                      >
                        <Trash className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingGroup ? 'Muokkaa hintaryhmää' : 'Uusi hintaryhmä'}
        maxWidth="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 sm:flex-initial">
              Peruuta
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 sm:flex-initial"
              disabled={!canManageSharedData}
            >
              Tallenna
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <FieldHelpLabel htmlFor="group-name" label="Nimi" required help={GROUP_FIELD_HELP.name} />
            <Input
              id="group-name"
              value={formData.name}
              onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
              placeholder={getGroupNamePlaceholder(formData.category)}
            />
          </div>
          <div className="space-y-2">
            <FieldHelpLabel htmlFor="group-category" label="Kategoria" help={GROUP_FIELD_HELP.category} />
            <Input
              id="group-category"
              list="installation-group-categories"
              value={formData.category}
              onChange={(event) => setFormData((current) => ({ ...current, category: event.target.value }))}
              placeholder="Valitse tai kirjoita kategoria"
            />
            <datalist id="installation-group-categories">
              {editableCategories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <FieldHelpLabel htmlFor="group-description" label="Kuvaus" help={GROUP_FIELD_HELP.description} />
            <Input
              id="group-description"
              value={formData.description}
              onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
              placeholder={getGroupDescriptionPlaceholder(formData.category)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <FieldHelpLabel htmlFor="group-price" label="Oletushinta" help={GROUP_FIELD_HELP.defaultPrice} />
              <Input
                id="group-price"
                type="number"
                step="0.01"
                value={formData.defaultPrice}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    defaultPrice: parseFloat(event.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <FieldHelpLabel htmlFor="group-margin" label="Oletuskate %" help={GROUP_FIELD_HELP.defaultMarginPercent} />
              <Input
                id="group-margin"
                type="number"
                step="0.1"
                value={formData.defaultMarginPercent}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    defaultMarginPercent: parseFloat(event.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <FieldHelpLabel htmlFor="group-installation" label="Oletusasennus" help={GROUP_FIELD_HELP.defaultInstallationPrice} />
              <Input
                id="group-installation"
                type="number"
                step="0.01"
                value={formData.defaultInstallationPrice}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    defaultInstallationPrice: parseFloat(event.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        title="Muokkaa näkyviä kategorioita"
        maxWidth="lg"
        footer={
          <Button onClick={() => setSettingsDialogOpen(false)} className="w-full sm:w-auto">
            Valmis
          </Button>
        }
      >
        <div className="space-y-6">
          <Alert>
            <AlertDescription>
              Täällä päätät, mitä kategorioita näytetään hintaryhmien yläpinnassa. Muutos vaikuttaa vain omaan näkymääsi, ei muiden käyttäjien näkymiin eikä itse hintaryhmädataan.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <div className="space-y-2">
                <FieldHelpLabel
                  label="Toimialapohja"
                  help="Valitse lähtöpohja, jonka mukaan kategoriat ehdotetaan yläpinnan suodattimiin. Voit muokata näkyvyyttä tämän jälkeen vapaasti."
                />
                <Select
                  value={categorySettings.industryPreset ?? 'custom'}
                  onValueChange={(value) => applyIndustryPreset(value as InstallationGroupIndustryPreset)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Valitse toimialapohja" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {presetMeta && (
                  <p className="text-sm leading-6 text-muted-foreground">{presetMeta.description}</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-950">Piilota tyhjät kategoriat</div>
                      <div className="text-sm text-muted-foreground">
                        Näytä yläpinnassa vain kategoriat, joissa on oikeasti hintaryhmiä.
                      </div>
                    </div>
                    <Switch
                      checked={categorySettings.hideEmptyCategories}
                      onCheckedChange={(checked) =>
                        updateCategorySettings((currentSettings: InstallationGroupCategorySettings) => ({
                          ...currentSettings,
                          hideEmptyCategories: checked,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-950">Näytä vain suosikit</div>
                      <div className="text-sm text-muted-foreground">
                        Rajaa suodatinpalkki vain niihin kategorioihin, jotka olet merkinnyt tärkeiksi.
                      </div>
                    </div>
                    <Switch
                      checked={categorySettings.showFavoritesOnly}
                      onCheckedChange={(checked) =>
                        updateCategorySettings((currentSettings: InstallationGroupCategorySettings) => ({
                          ...currentSettings,
                          showFavoritesOnly: checked,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <FieldHelpLabel
                  htmlFor="new-category-name"
                  label="Lisää oma kategoria"
                  help="Voit lisätä oman kategorian myös ennen kuin siihen kuuluu yhtään hintaryhmää. Tämä on hyödyllinen, jos rakennat näkymää uudelle toimialalle etukäteen."
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="new-category-name"
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder="Esim. Huoltosopimukset"
                  />
                  <Button type="button" onClick={handleAddCustomCategory} className="gap-2">
                    <Plus weight="bold" />
                    Lisää
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="text-sm font-semibold text-slate-950">Kategorioiden näkyvyys ja järjestys</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Valitse, mitkä kategoriat näkyvät suodattimissa ja missä järjestyksessä ne esitetään.
                </div>
              </div>
              <div className="divide-y divide-slate-200">
                {categoryItems.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-muted-foreground">
                    Ei kategorioita vielä. Valitse toimialapohja tai lisää ensimmäinen oma kategoria.
                  </div>
                ) : (
                  categoryItems.map((item, index) => (
                    <div key={item.name} className="space-y-3 px-4 py-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium text-slate-950">{item.name}</div>
                            {item.isPresetCategory && (
                              <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[11px]">
                                Pohjassa mukana
                              </Badge>
                            )}
                            {item.count > 0 && (
                              <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">
                                {item.count} ryhmää
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {item.count > 0
                              ? 'Kategoria on käytössä vähintään yhdellä hintaryhmällä.'
                              : 'Kategoria on valmis näkymään, vaikka siihen ei vielä kuulu hintaryhmiä.'}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <Checkbox
                              checked={item.visible}
                              onCheckedChange={(checked) =>
                                upsertCategoryPreference(item.name, { visible: Boolean(checked) })
                              }
                            />
                            Näytä
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <Checkbox
                              checked={item.favorite}
                              onCheckedChange={(checked) =>
                                upsertCategoryPreference(item.name, { favorite: Boolean(checked) })
                              }
                            />
                            Suosikki
                          </label>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => moveCategory(item.name, -1)}
                              disabled={index === 0}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => moveCategory(item.name, 1)}
                              disabled={index === categoryItems.length - 1}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>
                          {!item.isDynamicCategory && !item.isPresetCategory && item.name !== UNCATEGORIZED_CATEGORY && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveCategoryFromView(item.name)}
                            >
                              Poista
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
