import _ from 'lodash';
import entities from './entities';
import type { ContentType } from '@strapi/types/dist/types/core/schemas';

export default () => ({
  getContentTypeFromCtx,
  getTargetLocaleId,
  getMainLocaleIdFromCtx,
  getMainLocaleFromCtx,
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

async function getMainLocaleIdFromCtx(ctx: any) {
  const id = _.get(ctx, 'request.params.id');
  if (!id) return null;

  const contentType = getContentTypeFromCtx(ctx);
  if (!contentType) return null;

  const { localizations } = await entities().getLocalizationData(contentType, Number(id));
  if (!localizations) return null;

  return entities().getMainLocalizationId(localizations);
}

async function getMainLocaleFromCtx(ctx: any, params: any = {}): Promise<unknown | null> {
  const id = _.get(ctx, 'request.params.id');
  if (!id) return null;

  const contentType = getContentTypeFromCtx(ctx);
  if (!contentType) return null;

  const { localizations } = await entities().getLocalizationData(contentType, Number(id));
  if (!localizations) return null;

  return entities().getMainLocalization(contentType, localizations, params);
}
