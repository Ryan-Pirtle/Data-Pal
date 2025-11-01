import { motion } from "framer-motion";

export default function SectionHeader({ title, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center mb-6"
    >
      <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
      {subtitle && (
        <p className="text-gray-600 text-base mt-1">{subtitle}</p>
      )}
    </motion.div>
  );
}
