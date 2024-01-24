import _ from 'lodash';
import { ContentType } from '@strapi/types/dist/types/core/schemas';

export default () => ({
  getRelationTargets,
});

function getRelationTargets(contentType: ContentType) {
  const { attributes } = contentType;
  const relationAttrNames = Object.keys(attributes).filter(
    (attrName) =>
      attributes[attrName]?.type === 'relation' && attrName !== 'localizations'
  );

  const relationAttrTargets: Record<string, ContentType> = {};
  for (const attrName of relationAttrNames) {
    const schema = attributes[attrName];
    const target = _.get(schema, 'target');
    if (!target) continue;
    const targetContentType = strapi.contentTypes[target];
    if (!targetContentType) continue;
    relationAttrTargets[attrName] = targetContentType;
  }

  return relationAttrTargets;
}
