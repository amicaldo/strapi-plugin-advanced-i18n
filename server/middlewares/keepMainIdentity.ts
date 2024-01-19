import _ from 'lodash';
import requests from '../services/requests';
import entities from '../services/entities';
import contentTypes from '../services/contentTypes';
import { sanitize } from '@strapi/utils';
import { transformResponse } from '../utils/transform';
import type { ResponseData } from './index.d';
import type { ContentType } from '@strapi/types/dist/types/core/schemas';
import type { EntityService } from '../services/index.d';

export default () => {
  return async (ctx: any, next: () => Promise<any>) => {
    const targetLocaleId = await requests().getTargetLocaleId(ctx);
    if (targetLocaleId) {
      _.set(ctx, 'request.params.id', targetLocaleId);
    }

    await next();

    const data = _.get(ctx, 'response.body.data') as
      | ResponseData
      | ResponseData[]
      | undefined;
    const contentType = requests().getContentTypeFromCtx(ctx);
    if (!data || !contentType) return;
    await presentAsMainEntity(data as any, ctx.query.populate, contentType);
  };
};

async function presentAsMainEntity(
  data: ResponseData,
  populate: any,
  contentType: ContentType
) {
  if (_.isArray(data)) {
    for (const entry of data) {
      await presentAsMainEntity(entry, populate, contentType);
    }
    return;
  }

  const { attributes } = data;
  if (!attributes) return;

  const relationAttrTargets = contentTypes().getRelationTargets(contentType);
  Object.keys(relationAttrTargets).forEach((attrName) => {
    if (attributes[attrName]) return;
    delete relationAttrTargets[attrName];
  });

  const { locale, localizations } =
    ((await entities().getLocalizationData(
      contentType.uid,
      data.id
    )) as EntityService.Entity) || {};
  if (locale && localizations?.length) {
    const mainEntity = await entities().getMainEntity(
      contentType.uid,
      { localizations },
      {
        fields: ['id'],
        populate,
      }
    );

    if (mainEntity) {
      _.set(data, 'id', mainEntity.id);

      for (const [attrName, targetContentType] of Object.entries(relationAttrTargets)) {
        const relationValue = await sanitize.contentAPI.output(
          mainEntity[attrName],
          targetContentType
        );
        if (!relationValue) continue;
        const relationResponse = transformResponse(relationValue, undefined, {
          contentType: targetContentType,
        });
        delete relationResponse['meta'];

        _.set(data, `attributes.${attrName}`, relationResponse);
      }
    }
  }

  for (const [attrName, targetContentType] of Object.entries(relationAttrTargets)) {
    const relationData = _.get(data, `attributes.${attrName}.data`);
    console.log(attrName, relationData);
    if (!relationData) continue;

    const relationPopulate = _.get(populate, `${attrName}.populate`);
    await entities().fillInLocalizationAttributes(
      targetContentType,
      relationData,
      locale,
      relationPopulate
    );
    await presentAsMainEntity(relationData, relationPopulate, targetContentType);
  }
}
