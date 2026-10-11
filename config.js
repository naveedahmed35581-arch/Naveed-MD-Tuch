require('dotenv').config();
module.exports={
  WARN_COUNT: Number(process.env.WARN_COUNT||3),
  APIs:{}, APIKeys:{}
};
