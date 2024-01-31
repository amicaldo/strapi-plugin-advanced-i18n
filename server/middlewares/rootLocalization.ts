import _ from 'lodash';
import entities from '../services/entities';
import requests from '../services/requests';
import type { TransformedEntry } from '../utils/transform';

export default () => {
  return async (ctx: any, next: () => Promise<any>) => {
    await next();
    const data = _.get(ctx, 'response.body.data', []) as
      | TransformedEntry
      | TransformedEntry[];
    if (!data || _.isEmpty(data)) return;

    const query = _.get(ctx, 'request.query');
    const targetLocale = _.get(query, 'locale');
    if (!targetLocale) return;

    const contentType = requests().getContentTypeFromCtx(ctx);

    for (const entry of _.castArray(data)) {
      const id = _.get(entry, 'id');
      const attributes = _.get(entry, 'attributes');
      const locale = _.get(attributes, 'locale');
      if (!id || !locale || locale === targetLocale) continue;

      const { localizations } = await entities().getLocalizationData(
        contentType,
        Number(entry.id)
      );
      if (_.isEmpty(localizations)) continue;

      const targetLocaleId = localizations.find(
        (loc: any) => loc.locale === targetLocale
      )?.id;

      const localization = await strapi.entityService.findOne(
        contentType.uid,
        targetLocaleId,
        query
      );
      if (!localization) continue;

      for (const attrName of Object.keys(attributes)) {
        if (!_.has(localization, attrName)) continue;
        _.set(entry, `attributes.${attrName}`, localization[attrName]);
      }
    }
  };
};
