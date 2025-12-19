import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@constants/colors";
import { queueStyles as styles } from "./queueStyles";

interface QueuePaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const QueuePagination: React.FC<QueuePaginationProps> = ({
  page,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <View style={styles.pagination}>
      <TouchableOpacity
        style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
        onPress={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={24}
          color={page === 1 ? COLORS.textMuted : COLORS.text}
        />
      </TouchableOpacity>
      <Text style={styles.pageText}>
        {page} / {totalPages}
      </Text>
      <TouchableOpacity
        style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
        onPress={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
      >
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={page === totalPages ? COLORS.textMuted : COLORS.text}
        />
      </TouchableOpacity>
    </View>
  );
};

export default QueuePagination;
