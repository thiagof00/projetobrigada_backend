const { DataTypes } = require('sequelize')
const sequelize = require('./db')

const Usuario = sequelize.define('usuario', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nome:     { type: DataTypes.STRING, allowNull: false },
  email:    { type: DataTypes.STRING, unique: true },
  cpf:      { type: DataTypes.STRING, unique: true, allowNull: false },
  telefone: { type: DataTypes.STRING, allowNull: false },
  perfil:   { type: DataTypes.ENUM('CIVIL', 'BRIGADA', 'INTERNO'), allowNull: false },
  ativo:    { type: DataTypes.BOOLEAN, defaultValue: true },
}, { timestamps: true, createdAt: 'criado_em', updatedAt: false, underscored: true })

const Dispositivo = sequelize.define('dispositivo', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid:      { type: DataTypes.STRING, allowNull: false },
  descricao: { type: DataTypes.STRING },
  ativo:     { type: DataTypes.BOOLEAN, defaultValue: true },
}, { timestamps: true, createdAt: 'criado_em', updatedAt: false, underscored: true })

const Ocorrencia = sequelize.define('ocorrencia', {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  latitude:      { type: DataTypes.FLOAT },
  longitude:     { type: DataTypes.FLOAT },
  status:        { type: DataTypes.ENUM('ABERTA', 'EM_ATENDIMENTO', 'FINALIZADA'), defaultValue: 'ABERTA' },
  finalizado_em: { type: DataTypes.DATE },
}, { timestamps: true, createdAt: 'criado_em', updatedAt: false, underscored: true })

const UsuarioOcorrencia = sequelize.define('usuario_ocorrencia', {
  id:    { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  papel: { type: DataTypes.ENUM('BRIGADA', 'INTERNO') },
}, { timestamps: false, underscored: true })

const LogOcorrencia = sequelize.define('log_ocorrencia', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  descricao: { type: DataTypes.STRING, allowNull: false },
}, { timestamps: true, createdAt: 'criado_em', updatedAt: false, underscored: true })

// Associações
Usuario.hasMany(Ocorrencia, { foreignKey: 'usuario_id', as: 'ocorrencias_criadas' })
Ocorrencia.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' })

Usuario.hasMany(Ocorrencia, { foreignKey: 'brigadista_id', as: 'ocorrencias_atendidas' })
Ocorrencia.belongsTo(Usuario, { foreignKey: 'brigadista_id', as: 'brigadista' })

Usuario.hasMany(Dispositivo, { foreignKey: 'usuario_id' })
Dispositivo.belongsTo(Usuario, { foreignKey: 'usuario_id' })

Ocorrencia.hasMany(LogOcorrencia, { foreignKey: 'ocorrencia_id', as: 'logs' })
LogOcorrencia.belongsTo(Ocorrencia, { foreignKey: 'ocorrencia_id' })

Ocorrencia.hasMany(UsuarioOcorrencia, { foreignKey: 'ocorrencia_id' })
UsuarioOcorrencia.belongsTo(Ocorrencia, { foreignKey: 'ocorrencia_id' })

Usuario.hasMany(UsuarioOcorrencia, { foreignKey: 'usuario_id' })
UsuarioOcorrencia.belongsTo(Usuario, { foreignKey: 'usuario_id' })

module.exports = { sequelize, Usuario, Dispositivo, Ocorrencia, UsuarioOcorrencia, LogOcorrencia }
