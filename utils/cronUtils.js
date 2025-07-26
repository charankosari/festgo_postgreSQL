const { CronThing } = require("../models/services");

const upsertCronThing = async ({ entity, active = true, transaction }) => {
  const now = new Date();

  const existing = await CronThing.findOne({
    where: { entity },
    transaction,
  });

  if (existing) {
    return await existing.update({ active, last_run: now }, { transaction });
  } else {
    return await CronThing.create(
      { entity, active, last_run: now },
      { transaction }
    );
  }
};

module.exports = { upsertCronThing };
