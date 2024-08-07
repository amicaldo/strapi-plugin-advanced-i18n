import _ from 'lodash';
import contentTypes from '../../services/contentTypes';
import entities from '../../services/entities';
import database from '../../services/database';
import type { Subscriber } from '@strapi/database/dist/lifecycles';

const subscriber: Subscriber = async (event) => {
  const { action } = event;
  if (!action.startsWith('beforeCreate') && !action.startsWith('beforeUpdate'))
    return;

  const eventInfo = await database().getEventInfo(event);
  const contentType = _.get(eventInfo, 'contentType');
  const targetIds = _.get(eventInfo, 'targetIds');
  if (!contentType || _.isEmpty(targetIds)) return;

  const data = _.get(event, 'params.data');
  if (!data) return;

  const relationAttrTargets = contentTypes().getRelationTargets(contentType);
  for (const [attrName, target] of Object.entries(relationAttrTargets)) {
    const isLocalizedContentType = strapi
      .service('plugin::i18n.content-types')
      .isLocalizedContentType(target);
    if (!isLocalizedContentType || !_.has(data, attrName)) continue;

    const connect = database().getConnections(_.get(data, attrName));
    if (_.isEmpty(connect)) continue;

    const newConnect: { id: number }[] = [];

    for (const connection of connect) {
      newConnect.push(connection);

      const { id, ...more } = connection;

      const { localizations } = await entities().getLocalizationData(
        target,
        id
      );
      if (_.isEmpty(localizations)) continue;

      const mainLocalizationId = await entities().getMainLocalizationId(
        localizations
      );
      if (!mainLocalizationId) continue;

      newConnect.pop();
      newConnect.push({ id, ...more });
    }

    const disconnect = _.get(data, `${attrName}.disconnect`);
    _.set(data, attrName, { connect: newConnect, disconnect });
  }
};

export default subscriber;
