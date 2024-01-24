import _ from 'lodash';
import type { ContentType as ContentTypeUID } from '@strapi/types/dist/types/core/common/uid';
import type { EntityService } from './index.d';
import type { ContentType } from '@strapi/types/dist/types/core/schemas';
import type { EntityService as StrapiEntityService } from '@strapi/strapi';
import type { TransformedEntry } from '../utils/transform';

export default () => ({
  getLocalizationData,
  getMainLocalizationId,
  getMainLocalization,
  fillInLocalizationAttributes: fillInLocalizedAttributes,
});

async function getLocalizationData(contentType: ContentType, entityId: number) {
  const params = {
    fields: ['locale'],
    populate: {
      // @ts-ignore: Content-Type types cannot be used by plugins.
      localizations: {
        fields: ['id', 'locale'],
      },
    },
  };

  return strapi.entityService.findOne(contentType.uid, entityId, params as any);
}

async function getMainLocalizationId(localizations: EntityService.Entity[]) {
  const defaultLocale = await strapi.service('plugin::i18n.locales').getDefaultLocale();

  const { id } = localizations.find((loc: any) => loc.locale === defaultLocale) || {};
  return id;
}

async function getMainLocalization(
  contentType: ContentType,
  localizations: EntityService.Entity[],
  params: StrapiEntityService.Params.Pick<
    ContentTypeUID,
    'fields' | 'populate' | 'filters'
  > = {}
) {
  const mainLocaleId = await getMainLocalizationId(localizations);
  if (!mainLocaleId) return null;
  return strapi.entityService.findOne(contentType.uid, mainLocaleId, params);
}

async function getLocalization(
  contentType: ContentType,
  localizations: EntityService.Entity[],
  targetLocale: string,
  params: StrapiEntityService.Params.Pick<
    ContentTypeUID,
    'fields' | 'populate' | 'filters'
  > = {}
) {
  const { id } = localizations.find((loc: any) => loc.locale === targetLocale) || {};
  if (!id) return null;

  return strapi.entityService.findOne(contentType.uid, id, params);
}

async function fillInLocalizedAttributes(
  contentType: ContentType,
  data: TransformedEntry | TransformedEntry[],
  targetLocale: string,
  populate: any
) {
  if (_.isArray(data)) {
    for (const entity of data) {
      await fillInLocalizedAttributes(contentType, entity, targetLocale, populate);
    }
    return;
  } else if (!_.isObject(data)) {
    throw new Error(
      'The entities passed to fillInLocalizationAttributes() must be an object or array.'
    );
  }

  const { attributes } = data;

  const { locale, localizations } = await getLocalizationData(
    contentType,
    Number(data.id)
  );
  if (locale === targetLocale || _.isEmpty(localizations)) return;

  const localizedAttrNames: string[] = strapi
    .service('plugin::i18n.content-types')
    .getLocalizedAttributes(contentType)
    .filter((attrName) => attributes[attrName]);
  localizedAttrNames.push('locale');

  const localizedEntity = await getLocalization(
    contentType,
    localizations,
    targetLocale,
    { populate }
  );
  if (localizedEntity) {
    _.set(data, 'id', localizedEntity.id);
  }

  for (const attrName of localizedAttrNames) {
    const localizedValue = localizedEntity?.[attrName];
    if (!localizedValue) continue;
    _.set(data, `attributes.${attrName}`, localizedValue);
  }
}
