import numpy as np
from sklearn.preprocessing import OneHotEncoder

# convert text to integers (better way would be to one-hot encode)
def split_by_char(list_of_questions):
    q_parsed = []
    for q in list_of_questions:
        q_parsed.append([char for char in q])
    return q_parsed

# truncate larger questions, pad smaller ones
def truncate_pad(parsed_questions, max_length, padding_char):
    questions = []
    for q in parsed_questions:
        if len(q) > max_length:
            questions.append(q[:max_length])
        else:
            while len(q) < max_length:
                q.append(padding_char)
            questions.append(q)
    return questions

# get dictionaries of all possible characters
def get_dicts(text):
    chars = sorted(list(set(text)))
    char_indices = dict((c, i+1) for i, c in enumerate(chars))
    indices_char = dict((i+1, c) for i, c in enumerate(chars))
    return chars, char_indices, indices_char

# add start character

# convert lists of characters into lists of integers TODO: one-hot encode
def text_to_int(list_of_chars, char_indices):
    list_of_ints = []
    for c in list_of_chars:
        list_of_ints.append(char_indices[c])
    return list_of_ints

# make list of lagged questions (lagged by 1 character)
def lag_chars(parsed_questions):
    lagged = []
    for q in parsed_questions:
        lag = []
        for c in q[1:]:
            lag.append(c)
        lagged.append(lag)
    return lagged

# process data
def int_to_matrix(list_of_ints, max_len):
    m = len(list_of_ints)
    batch_array = np.zeros((m, max_len)).astype(int)
    len_batch = np.zeros(m).astype(int)
    for j, x in enumerate(list_of_ints):
        batch_array[j, ] = x
        len_batch[j] = max_len
    return batch_array, len_batch


def one_hot_encode(x, chars):
    enc = OneHotEncoder(n_values=len(chars))
    return enc.fit_transform(x.reshape(-1, 1)).toarray()

# big wrapper that takes a string and takes it all the way to an array
def strings_to_array(strings, chars, char_indices, indices_char,
                     max_length=45, padding_char='|', lag=False):
    if padding_char not in chars:
        chars.append(padding_char)
        char_indices[padding_char] = 0
        indices_char[0] = padding_char
    
    parsed = split_by_char(strings)
    if  lag:
        parsed = lag_chars(parsed)
        
    padded = truncate_pad(parsed, max_length, padding_char)
    
    ints = []
    for c in padded:
        ints.append(text_to_int(c, char_indices))
    
    mat = int_to_matrix(ints, max_length)[0]
    
    arr = []
    for c in mat:
        arr.append(one_hot_encode(c, chars))
    arr = np.array(arr)
    return arr

# one hot encodes answer strings as classes
def strings_to_classes(strings):
    uniques = np.unique(strings)
    string_indices = dict((c, i) for i, c in enumerate(uniques))
    indices_strings = dict((i, c) for i, c in enumerate(uniques))
    
    classes = []
    for s in strings:
        classes.append(string_indices[s])
    classes = np.array(classes)
    
    enc = OneHotEncoder()
    classes = enc.fit_transform(classes.reshape(-1, 1)).toarray()
    
    return classes, string_indices, indices_strings