import _ from 'lodash';
import type { ContentType as ContentTypeUID } from '@strapi/types/dist/types/core/common/uid';
import type { EntityService } from './index.d';
import type { ContentType } from '@strapi/types/dist/types/core/schemas';
import type { EntityService as StrapiEntityService } from '@strapi/strapi';
import type { TransformedEntry } from '../utils/transform';

export default () => ({
  getLocalizationData,
  getMainEntity,
  fillInLocalizationAttributes,
});

function getLocalizationData(uid: ContentTypeUID, entityId: number) {
  return strapi.entityService.findOne(uid, entityId, {
    fields: ['locale'],
    populate: {
      // @ts-ignore: Content-Type types cannot be used by plugins.
      localizations: {
        fields: ['id', 'locale'],
      },
    },
  });
}

async function getMainEntity(
  uid: ContentTypeUID,
  entity: { localizations: EntityService.Entity[] },
  params: StrapiEntityService.Params.Pick<
    ContentTypeUID,
    'fields' | 'populate' | 'filters'
  > = {}
) {
  const localizations = _.get(entity, 'localizations');
  if (!entity.localizations) {
    throw new Error(
      'The Entity passed to getMainEntity() must have a populated localizations field.'
    );
  }

  const defaultLocale = await strapi.service('plugin::i18n.locales').getDefaultLocale();

  const { id: mainEntityId } =
    localizations.find((loc: any) => loc.locale === defaultLocale) || {};
  if (!mainEntityId) return null;

  return strapi.entityService.findOne(uid, mainEntityId, params);
}

async function getLocalization(
  contentType: ContentType,
  entity: { localizations: EntityService.Entity[] },
  targetLocale: string,
  params: StrapiEntityService.Params.Pick<
    ContentTypeUID,
    'fields' | 'populate' | 'filters'
  > = {}
) {
  const localizations = _.get(entity, 'localizations');
  if (!entity.localizations) {
    throw new Error(
      'The Entity passed to getLocalizations() must have a populated localizations field.'
    );
  }

  const { id } = localizations.find((loc: any) => loc.locale === targetLocale) || {};
  if (!id) return null;

  return strapi.entityService.findOne(contentType.uid, id, params);
}

async function fillInLocalizationAttributes(
  contentType: ContentType,
  data: TransformedEntry | TransformedEntry[],
  targetLocale: string,
  populate: any
) {
  if (_.isArray(data)) {
    for (const entity of data) {
      await fillInLocalizationAttributes(contentType, entity, targetLocale, populate);
    }
    return;
  } else if (!_.isObject(data)) {
    throw new Error(
      'The entities passed to fillInLocalizationAttributes() must be an object or array.'
    );
  }

  const { attributes } = data;

  const { locale, localizations } = await getLocalizationData(
    contentType.uid,
    Number(data.id)
  );
  if (locale !== targetLocale && localizations?.length) {
    const localizedAttrNames = strapi
      .service('plugin::i18n.content-types')
      .getLocalizedAttributes(contentType)
      .filter((attrName) => attributes[attrName]);
    localizedAttrNames.push('locale');

    const localizedEntity = await getLocalization(
      contentType,
      { localizations },
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
}
