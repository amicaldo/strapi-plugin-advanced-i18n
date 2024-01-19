import _ from 'lodash';
import entities from './entities';
import type { ContentType } from '@strapi/types/dist/types/core/schemas';

export default () => ({
  getContentTypeFromCtx,
  getTargetLocaleId,
  //getMainLocaleId,
});

function getContentTypeFromCtx(ctx: any): ContentType | undefined {
  const apiName = _.get(ctx, 'state.route.info.apiName');
  if (!apiName) return;

  return strapi.contentTypes[`api::${apiName}.${apiName}`];
}

async function getTargetLocaleId(ctx: any): Promise<number | null> {
  const id = _.get(ctx, 'request.params.id');
  const locale = _.get(ctx, 'request.query.locale');

  if (!id || !locale) return null;

  const contentType = getContentTypeFromCtx(ctx);
  if (!contentType) return null;

  const { localizations } = await entities().getLocalizationData(contentType, id);
  if (!localizations) return null;

  const { id: targetId } = localizations.find((loc: any) => loc.locale === locale) || {};
  return Number(targetId) || null;
}

/*
async function getMainLocaleId(ctx: any): Promise<unknown | null> {
  const id = _.get(ctx, 'request.params.id');
  if (!id) return null;

  const contentType = getContentTypeFromCtx(ctx);
  if (!contentType) return null;

  const { localizations } = await entities().getLocalizationData(cont, Number(id));
  if (!localizations) return null;

  const { id: localeId } =
    (await entities().getMainEntity(uid, { localizations }, { fields: ['id'] })) || {};
  return localeId;
}
*/
