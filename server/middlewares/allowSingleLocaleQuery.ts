import _ from 'lodash';
import requests from '../services/requests';

export default () => {
  return async (ctx: any, next: () => Promise<any>) => {
    const targetLocaleId = await requests().getTargetLocaleId(ctx);
    if (targetLocaleId) {
      _.set(ctx, 'request.params.id', targetLocaleId);
    }

    await next();
  };
};
