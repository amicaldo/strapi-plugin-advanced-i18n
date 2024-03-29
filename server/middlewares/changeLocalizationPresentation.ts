import _ from "lodash";
import requests from "../services/requests";
import entities from "../services/entities";
import contentTypes from "../services/contentTypes";
import { sanitize } from "@strapi/utils";
import { transformResponse } from "../utils/transform";
import type { ContentType } from "@strapi/types/dist/types/core/schemas";
import type { EntityService } from "../services/index.d";
import type { TransformedEntry } from "../utils/transform";

export default () => {
  return async (ctx: any, next: () => Promise<any>) => {
    await next();

    const data = _.get(ctx, "response.body.data", []) as
      | TransformedEntry
      | TransformedEntry[];
    if (!data || _.isEmpty(data)) return;

    const contentType = requests().getContentTypeFromCtx(ctx);
    await presentAsMainLocalization(
      data,
      ctx.query.populate,
      ctx.query.locale,
      contentType
    );
  };
};

async function presentAsMainLocalization(
  data: TransformedEntry | TransformedEntry[],
  populate: any,
  targetLocale: string,
  contentType: ContentType
) {
  if (_.isArray(data)) {
    for (const entry of data) {
      await presentAsMainLocalization(
        entry,
        populate,
        targetLocale,
        contentType
      );
    }
    return;
  }

  const attributes = _.get(data, "attributes");
  if (!attributes) return;

  // Get records of relation attribute-names and their target content-types.
  const relationAttrTargets = contentTypes().getRelationTargets(contentType);
  Object.keys(relationAttrTargets).forEach((attrName) => {
    if (attributes[attrName]) return;
    delete relationAttrTargets[attrName];
  });

  const isLocalized = strapi
    .service("plugin::i18n.content-types")
    .isLocalizedContentType(contentType);
  if (isLocalized) {
    // Get localization data of the current entity.
    const { locale, localizations } =
      ((await entities().getLocalizationData(
        contentType,
        Number(data.id)
      )) as EntityService.Entity) || {};

    if (locale && localizations?.length) {
      // Get main localization of the current entity
      const mainLocalization = await entities().getMainLocalization(
        contentType,
        localizations,
        {
          fields: ["id"],
          populate,
        }
      );

      // Fill in the main localization's id and relation attributes.
      if (mainLocalization) {
        _.set(data, "id", mainLocalization.id);

        for (const [attrName, targetContentType] of Object.entries(
          relationAttrTargets
        )) {
          const relationValue = await sanitize.contentAPI.output(
            mainLocalization[attrName],
            targetContentType
          );
          if (!relationValue) continue;
          const relationResponse = transformResponse(relationValue, undefined, {
            contentType: targetContentType,
          });
          delete relationResponse["meta"];

          _.set(data, `attributes.${attrName}`, relationResponse);
        }
      }
    }
  }

  /*
   Localize relation attributes that were possibly filled in by the previous step, and have the main locale as their value.
   Then call this function recursively on the localized relation attributes.
  */
  for (const [attrName, targetContentType] of Object.entries(
    relationAttrTargets
  )) {
    const relationData = _.get(data, `attributes.${attrName}.data`);
    if (!relationData) continue;

    const relationPopulate = _.get(populate, `${attrName}.populate`);

    const isLocalized = strapi
      .service("plugin::i18n.content-types")
      .isLocalizedContentType(targetContentType);
    if (isLocalized) {
      await entities().fillInLocalizedAttributes(
        targetContentType,
        relationData,
        targetLocale,
        relationPopulate
      );
    }

    await presentAsMainLocalization(
      relationData,
      relationPopulate,
      targetLocale,
      targetContentType
    );
  }
}
